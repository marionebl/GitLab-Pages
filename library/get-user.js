module.exports = getUser;

function getUser(client, id) {
	return client.get(`/users/${id}`);
}
