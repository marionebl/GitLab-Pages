const passport = require('passport');
const GitLabStrategy = require('passport-gitlab2').Strategy;

module.exports = createClient;

function createClient(options) {
	const strategy = createStrategy(options);
	return passport.use(strategy);
}

function createStrategy(options) {
	const strategy = new GitLabStrategy(options,
	(accessToken, refreshToken, profile, cb) => {
		cb(null, {accessToken, refreshToken, profile});
	});

	strategy.authorizationParams = options => {
		return {
			state: options.state
		};
	};

	return strategy;
}
