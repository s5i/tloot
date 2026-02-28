package main

import (
	"context"
	"errors"
	"fmt"
	"image"
	"io"
	"os"

	_ "image/png"
)

func main() {
	ctx := context.Background()
	items := LoadItems()
	sprites := LoadSprites()

	img := loadImage("testdata/shrimps.png")

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

func loadImage(imgPath string) image.Image {
	imageFile, _ := os.Open(imgPath)
	defer imageFile.Close()
	img, _, _ := image.Decode(imageFile)
	return img
}
