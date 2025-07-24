package main

import (
	"context"
	"github.com/caarlos0/env/v11"
	"maunium.net/go/mautrix/event"
	"maunium.net/go/mautrix/format"
	"net/url"
	"os"
	"strings"
)
import (
	"encoding/json"
	"fmt"
	"io"
	mautrix "maunium.net/go/mautrix"
	"net/http"
)

type WorkflowChild struct {
	Name  string `json:"name"`
	PID   int64  `json:"pid"`
	State string `json:"state"`
}

type Workflow struct {
	Name     string          `json:"name"`
	Children []WorkflowChild `json:"children"`
	State    string          `json:"state"`
}

type PipelineResponse struct {
	Author    string     `json:"author"`
	Title     string     `json:"title"`
	Workflows []Workflow `json:"workflows"`
}

type Config struct {
	WoodpeckerURL    string `env:"CI_WOODPECKER_URL,required"`
	RepoID           int    `env:"CI_REPO_ID,required"`
	RepoName         string `env:"CI_REPO_NAME,required"`
	PipelineNumber   int    `env:"CI_PIPELINE_NUMBER,required"`
	WoodpeckerToken  string `env:"CI_WOODPECKER_TOKEN,required"`
	MatrixHomeServer string `env:"MATRIX_HOME_SERVER,required"`
	MatrixRoomAlias  string `env:"MATRIX_ROOM_ALIAS,required"`
	MatrixUser       string `env:"MATRIX_USER,required"`
	MatrixPassword   string `env:"MATRIX_PASSWORD,required"`
	RepoURL          string `env:"CI_REPO_URL,required"`
	CommitMessage    string `env:"CI_COMMIT_MESSAGE,required"`
	PRNumber         string `env:"CI_COMMIT_PULL_REQUEST"`
}

func main() {
	var cfg Config
	err := env.Parse(&cfg)
	if err != nil {
		fmt.Fprintf(os.Stderr, err.Error()+"\n")
		os.Exit(1)
	}
	if !(len(cfg.WoodpeckerURL) >= 8 && (cfg.WoodpeckerURL[:8] == "https://" || cfg.WoodpeckerURL[:7] == "http://")) {
		fmt.Fprintf(os.Stderr, "woodpeckerURL must start with https:// or http://\n")
		os.Exit(1)
	}
	cfg.WoodpeckerURL = strings.TrimRight(cfg.WoodpeckerURL, "/")

	woodpeckerResult, err := getPipeline(cfg)
	if err != nil {
		fmt.Fprintf(os.Stderr, err.Error()+"\n")
		os.Exit(1)
	}
	allSuccess := true
	workflowMessage := ""
	pipelineURL := fmt.Sprintf("%s/repos/%d/pipeline/%d", cfg.WoodpeckerURL, cfg.RepoID, cfg.PipelineNumber)

	for _, wf := range woodpeckerResult.Workflows {
		if wf.State == "failure" {
			allSuccess = false
			var failedChild int64
			for _, child := range wf.Children {
				if child.State == "failure" {
					failedChild = child.PID
				}
			}
			workflowMessage += fmt.Sprintf(" - Workflow [%s](%s/%d) failed 💥\n", wf.Name, pipelineURL, failedChild)
		}
	}
	pipelineMessage := fmt.Sprintf(
		"Pipeline #%d ([%s](%s)) in the repo *%s*, triggered by '%s'",
		cfg.PipelineNumber, woodpeckerResult.Title, pipelineURL, cfg.RepoName, woodpeckerResult.Author,
	)

	if cfg.PRNumber != "" {
		repoUrl, _ := url.JoinPath(cfg.RepoURL, "pull", cfg.PRNumber)
		pipelineMessage += fmt.Sprintf(" for PR [#%s](%s) -", cfg.PRNumber, repoUrl)
	}
	pipelineMessage += fmt.Sprintf(" commit '%s'", cfg.CommitMessage)

	if allSuccess {
		pipelineMessage += " passed ✅\n"
	} else {
		pipelineMessage += fmt.Sprintf(
			" failed ❌\n%s", workflowMessage,
		)
	}

	err = sendMessage(cfg, pipelineMessage)
	if err != nil {
		fmt.Fprintf(os.Stderr, err.Error()+"\n")
		os.Exit(1)
	}
}

func getPipeline(cfg Config) (*PipelineResponse, error) {
	url := fmt.Sprintf("%s/api/repos/%d/pipelines/%d", cfg.WoodpeckerURL, cfg.RepoID, cfg.PipelineNumber)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.WoodpeckerToken)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status: %s, body: %s", resp.Status, string(body))
	}

	var result PipelineResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

func sendMessage(cfg Config, message string) error {
	client, err := mautrix.NewClient(cfg.MatrixHomeServer, "", "")
	if err != nil {
		return err
	}
	_, err = client.Login(context.TODO(), &mautrix.ReqLogin{
		Type:             "m.login.password",
		Identifier:       mautrix.UserIdentifier{Type: mautrix.IdentifierTypeUser, User: cfg.MatrixUser},
		Password:         cfg.MatrixPassword,
		StoreCredentials: true,
	})
	if err != nil {
		return err
	}
	roomSum, err := client.GetRoomSummary(context.TODO(), cfg.MatrixRoomAlias)
	if err != nil {
		return err
	}
	content := format.RenderMarkdown(message, true, false)
	_, err = client.SendMessageEvent(context.TODO(), roomSum.RoomID, event.EventMessage, &content)
	if err != nil {
		return err
	}
	return nil
}
