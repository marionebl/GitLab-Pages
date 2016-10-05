const isAvailable = require('./is-available');

module.exports = checkAvailable;

function checkAvailable(pagesDir) {
	return result => {
		const jobs = result.data.map(item => {
			return isAvailable(item.path_with_namespace, pagesDir)
				.then(available => {
					item.available = available;
					return item;
				});
		});
		return Promise.all(jobs)
			.then(data => {
				result.data = data;
				return result;
			});
	};
}
