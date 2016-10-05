const path = require('path');
const querystring = require('querystring');
const url = require('url');

const express = require('express');
const level = require('level');
const normalizeUrl = require('normalize-url');
const sander = require('sander');

const config = require('./config');
const disablePages = require('./library/disable-pages');
const enablePages = require('./library/enable-pages');
const getProjects = require('./library/get-projects');
const getUser = require('./library/get-user');
const gitlab = require('./library/gitlab');
const isAvailable = require('./library/is-available');
const oauth = require('./library/oauth');
const reloadPages = require('./library/reload-pages');
const renderProjects = require('./library/render-projects');

const db = level('./.db', {valueEncoding: 'json'});
const router = new express.Router();
const callbackURL = normalizeUrl(`${config.publicUrl}/oauth2/callback`);
const hookUrl = normalizeUrl(`${config.publicUrl}/hook/`);
const pubDir = path.resolve(process.cwd(), config.publicPagesDir);
const getClient = gitlab(config.url);

const title = config.title;
const target = config.url;
const targetName = url.parse(target).hostname;

const oAuthOptions = {
	clientID: config.clientId,
	clientSecret: config.clientSecret,
	callbackURL,
	baseURL: config.url
};
const oauthClient = oauth(oAuthOptions, db);

router.get('/login', (req, res) => {
	if (req.session.user && req.session.token) {
		return res.redirect('/');
	}
	const params = req.query.params;
	const query = req.query.query;
	res.render('login', {title, params, query, target, targetName});
});

router.get('/logout', (req, res) => {
	res.redirect('/');
});

router.post('/logout', (req, res) => {
	req.session.user = null;
	req.session.token = null;
	res.redirect('/login');
});

router.get('/oauth2/authorize', (req, res, next) => {
	const payload = JSON.stringify({params: req.query.params, query: req.query.query});
	const state = new Buffer(payload).toString('base64');
	return oauthClient.authenticate('gitlab', {state})(req, res, next);
});

router.get('/oauth2/callback', (req, res, next) => {
	const options = {failureRedirect: '/login'};
	const queryState = JSON.parse(new Buffer(req.query.state, 'base64').toString('utf-8')) || {};
	const id = (JSON.parse(queryState.params || '{}')).id || '';
	const queryString = querystring.stringify(JSON.parse(queryState.query || '{}'));

	const onAuth = (error, data) => {
		if (error) {
			return res.redirect('/login');
		}
		req.session.token = data.accessToken;
		req.session.user = data.profile.id;
		res.redirect(`/${id}?${queryString}`);
	};
	const authenticate = oauthClient.authenticate('gitlab', options, onAuth);
	return authenticate(req, res, next);
});

router.get('/pages/:id', (req, res) => {
	if (!req.session.user || !req.session.token) {
		return res.redirect(`/login`);
	}
	return res.redirect('/');
});

router.post('/pages/:id', (req, res, next) => {
	if (!req.session.user || !req.session.token) {
		return res.redirect(`/login`);
	}

	const client = getClient(req.session.token);
	const ctx = {pagesDir: pubDir, hookUrl, user: req.session.user};

	if (req.body.reload === 'true') {
		return reloadPages(client, req.params.id, ctx)
			.then(res.redirect(`/${req.body.page}?search=${req.body.search}`))
			.catch(next);
	}

	if (req.body.enabled === 'false') {
		return disablePages(client, req.params.id, ctx)
			.then(res.redirect(`/${req.body.page}?search=${req.body.search}`))
			.catch(next);
	}
	return enablePages(client, req.params.id, ctx)
		.then(() => res.redirect(`/${req.body.page}?search=${req.body.search}`))
		.catch(next);
});

router.post('/hook', (req, res, next) => {
	const payload = req.body;
	// Pending: https://gitlab.com/gitlab-org/gitlab-ce/issues/22351#note_15819994
	// const token = req.headers['x-gitlab-token'];
	// if (!token) {
	// 	return res.status(403).send('Unacceptable');
	// }
	if (typeof payload.project_id !== 'number') { // eslint-disable-line camelcase
		console.error(`No project id`);
		return res.status(403).send('Unacceptable');
	}

	if (typeof payload.project !== 'object') {
		console.error(`No project data`);
		return res.status(403).send('Unacceptable');
	}

	if (typeof payload.project.path_with_namespace !== 'string') {
		console.error(`No project path_with_namespace`);
		return res.status(403).send('Unacceptable');
	}

	return isAvailable(payload.project.path_with_namespace, pubDir)
		.then(available => {
			if (!available) {
				console.error(`${payload.project.path_with_namespace} not available`);
				throw new Error('Not found');
			}
			return getPublicData(payload.project.path_with_namespace, pubDir);
		})
		.then(publicData => {
			if (!publicData || !publicData.userId) {
				console.error(`No public data for ${payload.project.path_with_namespace}`);
				throw new Error('Not found');
			}
			return getAdminData(db, publicData.userId);
		})
		.then(adminData => {
			if (!adminData) {
				console.error(`No admin data for ${payload.project.path_with_namespace}`);
				throw new Error('Not found');
			}
			return {
				user: adminData.id,
				client: getClient(adminData.privateToken, {private: true})
			};
		})
		.then(data => {
			const ctx = {pagesDir: pubDir, user: data.user};
			reloadPages(data.client, payload.project_id, ctx)
				.then(() => {
					console.log(`${payload.project_id} updated`);
				})
				.catch(error => {
					console.error(error);
				});
			return res.send('');
		})
		.catch(err => {
			console.error(err);
			const error = Error('Not found');
			error.code = 404;
			next(error);
		});
});

router.get('/:pageCount?', (req, res, next) => {
	if (!req.session.user || !req.session.token) {
		const query = querystring.stringify({params: JSON.stringify(req.params), query: JSON.stringify(req.query)});
		return res.redirect(`/login?${query}`);
	}

	if (req.params.pageCount && isNaN(Number(req.params.pageCount))) {
		return res.redirect('/');
	}

	const page = Number(req.params.pageCount) || 1;
	const order_by = 'last_activity_at'; // eslint-disable-line camelcase
	const search = req.query.search;
	const client = getClient(req.session.token);

	return getProjects(client, {page, order_by, search}, pubDir, hookUrl) // eslint-disable-line camelcase
		.then(data => {
			return getUser(client, req.session.user)
				.then(user => {
					data.user = user.data;
					return data;
				});
		})// eslint-disable-line camelcase
		.then(renderProjects(res, {search, title, target, targetName}))
		.catch(next);
});

function getAdminData(db, id) {
	return new Promise((resolve, reject) => {
		db.get(id, (err, adminData) => {
			if (err || !adminData) {
				return reject(err);
			}
			resolve(adminData);
		});
	});
}

function getPublicData(pathWithNamespace, pubDir) {
	if (typeof pathWithNamespace !== 'string' || typeof pubDir !== 'string') {
		return Promise.reject(new Error('getPublicData: input parameters must be of type string'));
	}
	const filePath = path.resolve(pubDir, `${pathWithNamespace}.json`);
	return sander
		.readFile(filePath)
		.then(contents => {
			return JSON.parse(contents);
		})
		.catch(error => {
			console.error(error);
			return null;
		});
}

module.exports = router;
