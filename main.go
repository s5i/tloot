package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"image"
	"io"
	"os"

	_ "image/png"
)

var (
	path = flag.String("path", "testdata/shrimps.png", "Path to loot image.")
)

func main() {
	ctx := context.Background()
	items := LoadItems()
	sprites := LoadSprites()
	path := *path

	imageFile, err := os.Open(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to open %q: %v", path, err)
		os.Exit(1)
	}
	defer imageFile.Close()

	img, _, err := image.Decode(imageFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to decode %q: %v", path, err)
		os.Exit(1)
	}

	p := NewProcess(ctx, img, items, sprites)
	total := 0

	for {
		r, err := p.Next()
		if errors.Is(err, io.EOF) {
			fmt.Printf("\nTotal: %d gp\n", total)
			break
		}
		if err != nil {
			fmt.Printf("\nError: %v\n", err)
			break
		}

		if r.Count != 0 {
			if r.Item.Value != 0 {
				fmt.Printf("%s: %d x %d gp = %d gp\n", r.Item.Name, r.Count, r.Item.Value, r.Count*r.Item.Value)
			} else {
				fmt.Printf("%s: %d x [PLAYER PRICE]\n", r.Item.Name, r.Count)
			}
			total += r.Count * r.Item.Value
		}
	}
}
