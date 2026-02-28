package process

import (
	"context"
	"errors"
	"image"
	"io"
	"os"
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

		p := Parallel(ctx, img, items, sprites)
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

func loadImage(imgPath string) image.Image {
	imageFile, _ := os.Open(imgPath)
	defer imageFile.Close()
	img, _, _ := image.Decode(imageFile)
	return img
}
