const path = require('path');
const sander = require('sander');

module.exports = removeRepository;

function removeRepository(client, id, ctx) {
	return client.get(`/projects/${id}`)
		.then(repo => {
			const pathWithNamespace = repo.data.path_with_namespace;
			const repositoryDirectory = path.resolve(ctx.pagesDir, pathWithNamespace);
			return Promise.all([
				sander.rimraf(repositoryDirectory),
				sander.rimraf(`${repositoryDirectory}.json`)
			]).catch(err => {
				console.error(err);
				return [];
			});
		});
}
