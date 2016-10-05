# gitlab-pages

> Host static sites from your GitLab projects

## Development

```sh
npm install

cp .defaults .env

# Edit configuration
vim .env

GITLAB_URL=https://gitlabhq.com # fully qualified url to your gitlab installation, required
# CLIENT_ID=                    # gitlab client id, obtain at $(GITLAB_URL)/profile/applications, required
# CLIENT_SECRET=                # gitlab client secret, obtain at $(GITLAB_URL)/profile/applications, required
PUBLIC_URL=https://glpages.localtunnel.me/
# SECRET=                       # secret, used for hashing, required


# First terminal
npm start

# Second terminal
npm run tunnel -- --open
```
