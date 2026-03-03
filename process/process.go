package process

import (
	"image"
	"time"

	_ "image/png"

	"github.com/deluan/lookup"
)

type ProcessResult struct {
	Item    ItemConfig
	Count   int
	Elapsed time.Duration
}

type CallbackProcessor struct {
	items   map[int]ItemConfig
	sprites SpriteMap
	lookup  *lookup.Lookup
}

func NewCallbackProcessor(img image.Image, items map[int]ItemConfig, sprites SpriteMap) *CallbackProcessor {
	return &CallbackProcessor{
		items:   items,
		sprites: sprites,
		lookup:  lookup.NewLookup(img),
	}
}

func (cp *CallbackProcessor) Process(item int) (ProcessResult, error) {
	t := time.Now()

	precision := defaultPrecision
	if p := cp.items[item].DetectPrecision; p != 0 {
		precision = p
	}

	found, err := cp.lookup.FindAll(cp.sprites[item], float64(precision)/100.0)
	if err != nil {
		return ProcessResult{}, err
	}

	size := cp.sprites[item].Bounds()
	dedupe := map[lookup.GPoint]bool{}
	for _, a := range found {
		dupe := false
		for b := range dedupe {
			if overlaps(a, b, size) || overlaps(b, a, size) {
				dupe = true
				break
			}
		}
		if !dupe {
			dedupe[a] = true
		}
	}

	return ProcessResult{
		Item:    cp.items[item],
		Count:   len(dedupe),
		Elapsed: time.Since(t),
	}, nil
}

func overlaps(a, b lookup.GPoint, size image.Rectangle) bool {
	return a.X >= b.X && a.X < b.X+size.Dx() && a.Y >= b.Y && a.Y < b.Y+size.Dy()
}

const defaultPrecision = 85
