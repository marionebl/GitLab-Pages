const addHook = require('./add-hook');
const getHook = require('./get-hook');
const downloadRepository = require('./download-repository');

module.exports = enablePages;

function enablePages(client, id, ctx) {
	return getHook(client, id)
		.then(hooks => {
			const current = hooks.data.find(hook => hook.url === ctx.hookUrl);
			return downloadRepository(client, id, {pagesDir: ctx.pagesDir, user: ctx.user})
				.then(() => {
					if (current) {
						return;
					}
					return addHook(client, id, {
						id,
						url: ctx.hookUrl,
						push_events: true // eslint-disable-line camelcase
					});
				});
		});
}
