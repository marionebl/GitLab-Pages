const addHook = require('./add-hook');
const getHook = require('./get-hook');
const downloadRepository = require('./download-repository');

module.exports = enablePages;

function enablePages(client, id, ctx) {
	const jobs = [
		() => createHookIfNeeded(client, id, ctx),
		() => downloadRepository(client, id, ctx)
	];
	return Promise.all(jobs.map(job => job()));
}

function createHookIfNeeded(client, id, ctx) {
	return findHook(client, id, ctx.hookUrl)
		.then(hook => {
			if (hook) {
				return;
			}
			const settings = {
				id,
				url: ctx.hookUrl,
				push_events: true // eslint-disable-line camelcase
			};
			return addHook(client, id, settings);
		});
}

function findHook(client, id, url) {
	return getHook(client, id)
		.then(hooks => {
			return hooks.data.find(hook => hook.url === url);
		});
}
