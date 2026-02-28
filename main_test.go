package main

import (
	"context"
	"errors"
	"io"
	"testing"

	_ "image/png"
)

var items map[int]ItemConfig
var sprites SpriteMap

func TestMain(m *testing.M) {
	items = LoadItems()
	sprites = LoadSprites()
	m.Run()
}

func BenchmarkProcess(b *testing.B) {
	img := loadImage("testdata/shrimps.png")
	for b.Loop() {
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		p := NewProcess(ctx, img, items, sprites)
		for {
			_, err := p.Next()
			if errors.Is(err, io.EOF) {
				break
			}
			if err != nil {
				b.Fatal(err)
			}
		}
	}
}
