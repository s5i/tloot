package process

import (
	"image"
	"os"
	"testing"

	_ "image/png"

	"golang.org/x/sync/errgroup"
)

var img image.Image
var items map[int]ItemConfig
var sprites SpriteMap

func TestMain(m *testing.M) {
	items = LoadItems()
	sprites = LoadSprites()
	img = loadImage("testdata/shrimps.png")
	m.Run()
}

func BenchmarkSerial(b *testing.B) {
	for b.Loop() {
		p := NewCallbackProcessor(img, items, sprites)
		for _, i := range items {
			if _, err := p.Process(i.ID); err != nil {
				b.Error(err)
			}
		}
	}
}

func BenchmarkParallel(b *testing.B) {
	for b.Loop() {
		eg := errgroup.Group{}
		p := NewCallbackProcessor(img, items, sprites)
		for _, i := range items {
			eg.Go(func() error {
				_, err := p.Process(i.ID)
				return err
			})
		}
		if err := eg.Wait(); err != nil {
			b.Fatal(err)
		}
	}
}

func TestAssets(t *testing.T) {
	for _, item := range items {
		if _, ok := sprites[item.ID]; !ok {
			t.Errorf("missing sprite for item %d (%s)", item.ID, item.Name)
		}
	}
	for id := range sprites {
		if _, ok := items[id]; !ok {
			t.Errorf("missing config for sprite id = %d", id)
		}
	}
}

func loadImage(imgPath string) image.Image {
	imageFile, _ := os.Open(imgPath)
	defer imageFile.Close()
	img, _, _ := image.Decode(imageFile)
	return img
}
