const path = require('path');
const sander = require('sander');
const checkAvailable = require('./check-available');
const checkEnabled = require('./check-enabled');

module.exports = getProjects;

function getProjects(client, options, pubDir, hookUrl) {
	return client.get('/projects', options)
		.then(checkAvailable(pubDir))
		.then(checkEnabled(client, hookUrl))
		.then(getSavedData(pubDir));
}

function getSavedData(pubDir) {
	return result => {
		const jobs = result.data.map(project => {
			if (!project.available) {
				project.saved = {};
				return Promise.resolve(project);
			}
			const jsonPath = path.resolve(pubDir, `${project.path_with_namespace}.json`);
			return sander.readFile(jsonPath)
				.then(contents => {
					project.saved = JSON.parse(contents);
					return project;
				})
				.catch(err => {
					console.error(err);
					project.saved = {};
					return project;
				});
		});

		return Promise.all(jobs)
			.then(data => {
				result.data = data;
				return result;
			});
	};
}
