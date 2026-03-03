package process

import (
	_ "embed"

	"gopkg.in/yaml.v2"
)

type ItemConfig struct {
	ID              int    `yaml:"id"`
	Name            string `yaml:"name"`
	Value           int    `yaml:"value"`
	Category        string `yaml:"category"`
	DetectPrecision int    `yaml:"detect_precision"`
}

type itemConfig struct {
	Items map[int]ItemConfig `yaml:"items"`
}

//go:embed assets/items.yaml
var itemCfgData []byte

func LoadItems() map[int]ItemConfig {
	ret := &itemConfig{}
	if err := yaml.Unmarshal(itemCfgData, ret); err != nil {
		panic(err)
	}

	for k, v := range ret.Items {
		v.ID = k
		ret.Items[k] = v
	}

	return ret.Items
}
