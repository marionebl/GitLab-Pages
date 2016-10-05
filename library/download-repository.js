const path = require('path');
const createWriteStream = require('fstream').Writer;
const sander = require('sander');
const targz = require('tar.gz');

module.exports = downloadRepository;

function downloadRepository(client, id, ctx) {
	return client.get(`/projects/${id}`)
		.then(repo => {
			const defaultBranch = repo.data.default_branch; // eslint-disable-line camelcase
			return client.get(`/projects/${id}/repository/branches/${defaultBranch}`)
				.then(branch => {
					repo.data.branch = branch.data;
					return repo;
				});
		})
		.then(repo => {
			if (!ctx.user) {
				throw new Error(`downloadRepository: ctx.user is required`);
			}
			return client.get(`/users/${ctx.user}`)
				.then(user => {
					return {repo, user: user.data};
				});
		})
		.then(result => {
			const publicData = {
				userId: result.user.id,
				username: result.user.username,
				userUrl: result.user.web_url,
				branch: result.repo.data.branch.name,
				sha: result.repo.data.branch.commit.id,
				message: result.repo.data.branch.commit.message,
				mtime: new Date()
			};

			const pathWithNamespace = result.repo.data.path_with_namespace;
			const targetBase = path.resolve(ctx.pagesDir, pathWithNamespace);
			const jsonPath = `${targetBase}.json`;

			return download(client, id, targetBase)
				.then(() => {
					return sander.mkdir(targetBase)
						.then(() => {
							return sander.writeFile(jsonPath, JSON.stringify(publicData, null, '  '));
						});
				});
		});
}

function download(client, id, targetBase) {
	return new Promise((resolve, reject) => {
		const stream = client.stream(`/projects/${id}/repository/archive`);
		const target = targz().createParseStream();
		const jobs = [];
		let exiting = false;

		target.on('entry', entry => {
			const fragments = path.normalize(entry.path)
				.split(path.sep)
				.filter(Boolean)
				.slice(1);

			if (entry.type === 'File' && fragments[0] === 'docs') {
				const relativePath = fragments.slice(1).join(path.sep);
				const entryPath = path.resolve(targetBase, relativePath);
				const target = createWriteStream(entryPath);

				jobs.push(new Promise((resolve, reject) => {
					entry.pipe(target)
						.on('close', resolve)
						.on('error', reject);
				}));
			}

			const sorted = ['docs', fragments[0] || 'docs'].sort();
			if (sorted[1] !== 'docs') {
				if (!exiting) {
					exiting = true;
					resolve(Promise.all(jobs));
				}
			}
		});

		target.on('error', reject);
		target.on('end', () => {
			if (!exiting) {
				exiting = true;
				resolve(Promise.all(jobs));
			}
		});
		stream.on('error', reject);
		stream.pipe(target);
	});
}
