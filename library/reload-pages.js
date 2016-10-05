const path = require('path');
const sander = require('sander');
const downloadRepository = require('./download-repository');
// const removeRepository = require('./remove-repository');

module.exports = reloadPages;

const stageDir = path.resolve(process.cwd(), '.stage');

function reloadPages(client, id, ctx) {
	return client.get(`/projects/${id}`)
		.then(repo => {
			// Move page data to .stage
			const pathWithNamespace = repo.data.path_with_namespace;
			const jobs = [
				sander.rename(ctx.pagesDir, pathWithNamespace).to(stageDir, pathWithNamespace),
				sander.rename(ctx.pagesDir, `${pathWithNamespace}.json`).to(stageDir, `${pathWithNamespace}.json`)
			];
			return Promise.all(jobs).then(() => {
				return {pathWithNamespace};
			});
		})
		.then(data => {
			return downloadRepository(client, id, {pagesDir: ctx.pagesDir, user: ctx.user})
				.then(() => {
					return {pathWithNamespace: data.pathWithNamespace, downloaded: true};
				})
				.catch((err) => {
					return {err, pathWithNamespace: data.pathWithNamespace, downloaded: false};
				});
		})
		.then(data => {
			if (data.downloaded) {
				// Remove stage data after successfull upate
			} else {
				// Roll back
				const pathWithNamespace = data.pathWithNamespace;
				console.error(`Downloading ${pathWithNamespace} failed, rolling back from ${stageDir}`);
				if (data.err) {
					console.error(data.err);
				}
				const jobs = [
					sander.rename(stageDir, pathWithNamespace).to(ctx.pagesDir, pathWithNamespace),
					sander.rename(stageDir, `${pathWithNamespace}.json`).to(ctx.pagesDir, `${pathWithNamespace}.json`)
				];
				return Promise.all(jobs);
			}
		});
}
