const getHook = require('./get-hook');
const isPermitted = require('./is-permitted');

module.exports = checkEnabled;

function checkEnabled(client, hookUrl) {
	return result => {
		const jobs = result.data.map(project => {
			if (!project.available) {
				project.enabled = false;
				return Promise.resolve(project);
			}
			if (!isPermitted(project)) {
				project.enabled = false;
				return Promise.resolve(project);
			}
			return getHook(client, project.id)
				.then(hooks => {
					project.enabled = hooks.data.some(hook => hook.url === hookUrl);
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
