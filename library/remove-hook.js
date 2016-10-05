module.exports = removeHook;

function removeHook(client, id, hookId) {
	return client.delete(`/projects/${id}/hooks/${hookId}`);
}
