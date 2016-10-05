const getHook = require('./get-hook');
const removeHook = require('./remove-hook');
const removeRepository = require('./remove-repository');

module.exports = disablePages;

function disablePages(client, id, ctx) {
	return getHook(client, id)
		.then(hooks => {
			const current = hooks.data.find(hook => hook.url === ctx.hookUrl);
			return Promise.all([
				current ? removeHook(client, id, current.id) : Promise.resolve(),
				removeRepository(client, id, {pagesDir: ctx.pagesDir})
			]);
		});
}
