const path = require('path');
const exists = require('path-exists');

module.exports = isAvailable;

function isAvailable(item, pubDir) {
	const dir = path.resolve(pubDir, item);
	const jobs = [exists(dir), exists(`${dir}.json`)];
	return Promise.all(jobs)
		.then(results => results.every(result => result === true))
		.catch(err => {
			console.error(err);
			return false;
		});
}
