const downloadRepository = require('./download-repository');
const removeRepository = require('./remove-repository');

module.exports = reloadPages;

function reloadPages(client, id, ctx) {
	return removeRepository(client, id, {pagesDir: ctx.pagesDir})
		.then(() => {
			return downloadRepository(client, id, {pagesDir: ctx.pagesDir});
		});
}
