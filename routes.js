const path = require('path');
const querystring = require('querystring');
const url = require('url');

const express = require('express');
const normalizeUrl = require('normalize-url');
const config = require('./config');

const disablePages = require('./library/disable-pages');
const enablePages = require('./library/enable-pages');
const getProjects = require('./library/get-projects');
const getUser = require('./library/get-user');
const gitlab = require('./library/gitlab');
const oauth = require('./library/oauth');
const reloadPages = require('./library/reload-pages');
const renderProjects = require('./library/render-projects');

const router = new express.Router();
const callbackURL = normalizeUrl(`${config.publicUrl}/oauth2/callback`);
const hookUrl = normalizeUrl(`${config.publicUrl}/hook/`);
const pubDir = path.resolve(process.cwd(), config.publicPagesDir);
const getClient = gitlab(config.url);

const title = config.title;
const target = config.url;
const targetName = url.parse(target).hostname;

const oauthClient = oauth({
	clientID: config.clientId,
	clientSecret: config.clientSecret,
	callbackURL,
	baseURL: config.url
});

router.get('/login', (req, res) => {
	if (req.session.user && req.session.token) {
		return res.redirect('/');
	}
	const params = req.query.params;
	const query = req.query.query;
	res.render('login', {title, params, query, target, targetName});
});

router.get('/logout', (req, res) => {
	res.send('Foo');
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
		console.log({ctx});
		return disablePages(client, req.params.id, ctx)
			.then(res.redirect(`/${req.body.page}?search=${req.body.search}`))
			.catch(next);
	}
	return enablePages(client, req.params.id, ctx)
		.then(() => res.redirect(`/${req.body.page}?search=${req.body.search}`))
		.catch(next);
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

module.exports = router;
