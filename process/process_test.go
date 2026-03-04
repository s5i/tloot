package process

import (
	"flag"
	"fmt"
	"image"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"testing"

	_ "image/png"

	"github.com/google/go-cmp/cmp"
	"golang.org/x/sync/errgroup"
)

var update = flag.Bool("update", false, "update golden files")

var benchmarkImg image.Image
var items map[int]ItemConfig
var sprites SpriteMap

func TestMain(m *testing.M) {
	flag.Parse()
	items = LoadItems()
	sprites = LoadSprites()
	benchmarkImg = loadImage("testdata/benchmark.png")
	os.Exit(m.Run())
}

func BenchmarkSerial(b *testing.B) {
	for b.Loop() {
		p := NewCallbackProcessor(benchmarkImg, items, sprites)
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
		p := NewCallbackProcessor(benchmarkImg, items, sprites)
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
	t.Parallel()

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

func TestDetect(t *testing.T) {
	t.Parallel()

	files, err := filepath.Glob("testdata/detect_*.png")
	if err != nil {
		t.Fatal(err)
	}
	if len(files) == 0 {
		t.Fatal("no testdata/detect_*.png files found")
	}

	for _, imgFile := range files {
		name := strings.TrimSuffix(filepath.Base(imgFile), ".png")
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			img := loadImage(imgFile)
			p := NewCallbackProcessor(img, items, sprites)

			var mu sync.Mutex
			var lines []string
			total := 0

			eg := errgroup.Group{}
			for _, item := range items {
				eg.Go(func() error {
					res, err := p.Process(item.ID)
					if err != nil {
						return err
					}

					mu.Lock()
					total += res.Count
					if res.Count > 0 {
						lines = append(lines, fmt.Sprintf("%s: %d", res.Item.Name, res.Count))
					}
					mu.Unlock()
					return nil
				})
			}
			if err := eg.Wait(); err != nil {
				t.Fatal(err)
			}

			sort.Strings(lines)
			got := fmt.Sprintf("Total item count: %d\n\n", total) + strings.Join(lines, "\n") + "\n"

			goldenFile := filepath.Join("testdata", name+".txt")
			if *update {
				if err := os.WriteFile(goldenFile, []byte(got), 0644); err != nil {
					t.Fatal(err)
				}
			}

			golden, err := os.ReadFile(goldenFile)
			if err != nil {
				t.Fatalf("golden file not found (run with -update to create): %v", err)
			}
			want := string(golden)

			if diff := cmp.Diff(want, got); diff != "" {
				t.Errorf("output mismatch for %s (-want +got):\n%s", imgFile, diff)
			}

			if got != string(want) {

			}
		})
	}
}

func loadImage(imgPath string) image.Image {
	imageFile, _ := os.Open(imgPath)
	defer imageFile.Close()
	img, _, _ := image.Decode(imageFile)
	return img
}
