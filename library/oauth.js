const passport = require('passport');
const GitLabStrategy = require('passport-gitlab2').Strategy;

module.exports = createClient;

function createClient(options, db) {
	const strategy = createStrategy(options, db);
	return passport.use(strategy);
}

function createStrategy(options, db) {
	const strategy = new GitLabStrategy(options, onSuccess(db));

	strategy.authorizationParams = options => {
		return {
			state: options.state
		};
	};

	return strategy;
}

function onSuccess(db) {
	return (accessToken, refreshToken, profile, cb) => {
		const id = profile.id;
		const data = {
			id: profile.id,
			privateToken: profile._json.private_token
		};
		db.put(id, data, err => {
			if (err) {
				return cb(err);
			}
			cb(null, {accessToken, refreshToken, profile});
		});
	};
}
