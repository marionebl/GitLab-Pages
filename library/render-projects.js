const isPermitted = require('./is-permitted');

module.exports = renderProjects;

function renderProjects(res, data) {
	return result => {
		const pages = Array(result.pagination.totalPages)
			.fill(true)
			.map((_, i) => {
				const count = i + 1;
				return {
					label: count,
					page: count > 1 ? count : '',
					active: count === result.pagination.page
				};
			});

		const previous = result.pagination.prevPage === 0 ? '' : result.pagination.prevPage;
		const next = result.pagination.nextPage;

		const projects = result.data
			.map(item => {
				return {
					available: item.available,
					avatarUrl: item.avatar_url,
					description: item.description,
					enabled: item.enabled,
					id: item.id,
					nameWithNamespace: item.name_with_namespace,
					pathWithNamespace: item.path_with_namespace,
					permitted: isPermitted(item),
					time: item.saved.mtime,
					timeName: item.saved.mtime,
					sha: item.saved.sha,
					branch: item.saved.branch,
					message: (item.saved.message || '').slice(0, 80),
					username: item.saved.username,
					userUrl: item.saved.userUrl,
					webUrl: item.web_url
				};
			});

		res.render('projects', {
			projects, pages, previous, next, search: data.search,
			page: result.pagination.page, target: data.target, targetName: data.targetName,
			title: data.title, userAvatarUrl: result.user.avatar_url, username: result.user.username
		});
	};
}
