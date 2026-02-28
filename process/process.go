package process

import (
	"context"
	"image"
	"io"

	_ "image/png"

	"github.com/deluan/lookup"
	"golang.org/x/sync/errgroup"
)

type Processor struct {
	results chan ProcessResult
	error   chan error
}

func (p *Processor) Next() (ProcessResult, error) {
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

type ProcessResult struct {
	Item  ItemConfig
	Count int
}

func New(ctx context.Context, img image.Image, items map[int]ItemConfig, sprites SpriteMap) *Processor {
	p := &Processor{
		results: make(chan ProcessResult, len(items)),
		error:   make(chan error, 1),
	}

	l := lookup.NewLookup(img)

	eg, _ := errgroup.WithContext(ctx)
	for k, v := range items {
		eg.Go(func() error {
			pp, err := l.FindAll(sprites[k], 0.9)
			if err != nil {
				return err
			}

			p.results <- ProcessResult{
				Item:  v,
				Count: len(pp),
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
