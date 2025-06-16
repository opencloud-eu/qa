Simple script to send status notifications of woodpecker CI to a matrix channel.

## Run
1. set these environment variables ([some of them are set automatically by woodpecker CI](https://woodpecker-ci.org/docs/usage/environment#built-in-environment-variables)):
   - `CI_WOODPECKER_URL`
   - `CI_REPO_ID`
   - `CI_REPO_NAME`
   - `CI_PIPELINE_NUMBER`
   - `CI_WOODPECKER_TOKEN`
   - `MATRIX_HOME_SERVER`
   - `MATRIX_ROOM_ALIAS`
   - `MATRIX_USER`
   - `MATRIX_PASSWORD`
2. `go run matrix-notification.go`
