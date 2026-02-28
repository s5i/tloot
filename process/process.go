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

type ProcessResult struct {
	Item    ItemConfig
	Count   int
	Elapsed time.Duration
}

func Parallel(ctx context.Context, img image.Image, items map[int]ItemConfig, sprites SpriteMap) *ParallelProcessor {
	p := &ParallelProcessor{
		results: make(chan ProcessResult, len(items)),
		error:   make(chan error, 1),
	}

	l := lookup.NewLookup(img)

	eg, _ := errgroup.WithContext(ctx)

	for k, v := range items {
		t := time.Now()
		eg.Go(func() error {
			pp, err := l.FindAll(sprites[k], 0.85)
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

func Serial(ctx context.Context, img image.Image, items map[int]ItemConfig, sprites SpriteMap) ([]ProcessResult, error) {
	var ret []ProcessResult
	l := lookup.NewLookup(img)

	for k, v := range items {
		t := time.Now()
		pp, err := l.FindAll(sprites[k], 0.85)
		if err != nil {
			return nil, err
		}

		ret = append(ret, ProcessResult{
			Item:    v,
			Count:   len(pp),
			Elapsed: time.Since(t),
		})
	}

	return ret, nil
}
