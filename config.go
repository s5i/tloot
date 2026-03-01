package main

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v2"
)

type Config struct {
	ProvidedEndpoints struct {
		UI string `yaml:"ui"`
	} `yaml:"provided_endpoints"`
}

func ReadConfig(path string) (*Config, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read %q: %v", path, err)
	}

	cfg := &Config{}
	if err := yaml.Unmarshal(b, cfg); err != nil {
		return nil, fmt.Errorf("failed to unmarshal %q: %v", path, err)
	}

	return cfg, nil
}

func defaultConfigPath() string {
	if os.Geteuid() == 0 {
		return "/usr/local/tloot/config.yaml"
	}
	return fmt.Sprintf("%s/.tloot/config.yaml", os.Getenv("HOME"))
}
