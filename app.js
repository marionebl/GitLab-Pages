const path = require('path');
const querystring = require('querystring');
const express = require('express');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const exphbs	= require('express-handlebars');
const routes = require('./routes');
const config = require('./config');
const gitlab = require('./library/gitlab');
const getClient = gitlab(config.url);

var app = express();

// Populates req.session
app.use(session({
	resave: false, // don't save session if unmodified
	saveUninitialized: false, // don't create session until something stored
	secret: config.secret
}));

app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

app.use((req, res, next) => {
	const authorized = Boolean(req.session.user && req.session.token);
	const whitelisted = req.path === '/login' || req.path.indexOf('/oauth') === 0;

	if (req.path === '/login' && authorized) {
		return res.redirect(`${req.query.path}?${querystring.stringify(req.query.query)}`);
	}

	if (authorized || whitelisted) {
		return next();
	}

	const query = querystring.stringify({
		path: req.path,
		query: JSON.stringify(req.query)
	});

	res.status(401).redirect(`/login?${query}`);
});

app.use('/', routes);

const serve = express.static(path.resolve(process.cwd(), config.publicPagesDir));

// Pages
app.use('/pages', (req, res, next) => {
	const id = req.path.split('/').filter(Boolean).slice(0, 2).join('/');

	return getAuthorization(req.session.token, id)
		.then(authorized => {
			if (!authorized) {
				return res.render('forbidden');
			}
			serve(req, res, next);
		});
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
	app.use((err, req, res) => {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

// production error handler
// no stacktraces leaked to user
app.use((err, req, res) => {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});

module.exports = app;

function getAuthorization(token, id) {
	const key = [token, id].join(':');
	const cached = {};

	if (!cached[key]) {
		cached[key] = getClient(token)
			.get(`/projects/${encodeURIComponent(id)}`)
			.then(result => {
				const access = result.data.permissions.project_access ||
					result.data.permissions.group_access;
				return Boolean(access);
			})
			.catch(error => {
				console.log(error);
				return false;
			});
	}

	return cached[key];
}
