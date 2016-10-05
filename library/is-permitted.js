module.exports = isPermitted;

function isPermitted(item) {
	/*
	 * 10 => Guest
	 * 20 => Reporter
	 * 30 => Developer
	 * 40 => Master
	 * 50 => Owner
	 */
	const perms = item.permissions || {};
	const perm = perms.project_access || perms.group_access || {access_level: 0}; // eslint-disable-line camelcase
	return perm.access_level >= 40;
}
