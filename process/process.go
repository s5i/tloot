package process

import (
	"context"
	"image"
	"io"
	"time"

	_ "image/png"

	"github.com/deluan/lookup"
	"golang.org/x/sync/errgroup"
)

var precision = 0.85

type ProcessResult struct {
	Item    ItemConfig
	Count   int
	Elapsed time.Duration
}

type ParallelProcessor struct {
	results chan ProcessResult
	error   chan error
}

func (p *ParallelProcessor) Next() (ProcessResult, error) {
	select {
	case r, ok := <-p.results:
		if !ok {
			return ProcessResult{}, io.EOF
		}

		return r, nil

	case err := <-p.error:
		return ProcessResult{}, err
	}
}

func NewParallelProcessor(ctx context.Context, img image.Image, items map[int]ItemConfig, sprites SpriteMap) *ParallelProcessor {
	p := &ParallelProcessor{
		results: make(chan ProcessResult, len(items)),
		error:   make(chan error, 1),
	}

	l := lookup.NewLookup(img)

	eg, _ := errgroup.WithContext(ctx)

	for k, v := range items {
		t := time.Now()
		eg.Go(func() error {
			pp, err := l.FindAll(sprites[k], precision)
			if err != nil {
				return err
			}

			p.results <- ProcessResult{
				Item:    v,
				Count:   len(pp),
				Elapsed: time.Since(t),
			}

			return nil
		})
	}

	go func() {
		if err := eg.Wait(); err != nil {
			p.error <- err
			return
		}

		close(p.results)
	}()

	return p
}

type CallbackProcessor struct {
	items   map[int]ItemConfig
	sprites SpriteMap
	lookup  *lookup.Lookup
}

func overlaps(a, b lookup.GPoint, size image.Rectangle) bool {
	return a.X >= b.X && a.X < b.X+size.Dx() && a.Y >= b.Y && a.Y < b.Y+size.Dy()
}

func (p *CallbackProcessor) Process(item int) (ProcessResult, error) {
	t := time.Now()

	found, err := p.lookup.FindAll(p.sprites[item], precision)
	if err != nil {
		return ProcessResult{}, err
	}

	size := p.sprites[item].Bounds()
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
		Item:    p.items[item],
		Count:   len(dedupe),
		Elapsed: time.Since(t),
	}, nil
}

func NewCallbackProcessor(img image.Image, items map[int]ItemConfig, sprites SpriteMap) *CallbackProcessor {
	return &CallbackProcessor{
		items:   items,
		sprites: sprites,
		lookup:  lookup.NewLookup(img),
	}
}
