package main

import (
	"embed"
	"image"
	"path/filepath"
	"strconv"
	"strings"
)

type SpriteMap map[int]image.Image

//go:embed assets/sprites/*.png
var spriteData embed.FS

func LoadSprites() SpriteMap {
	ret := SpriteMap{}
	dir, err := spriteData.ReadDir("assets/sprites")
	if err != nil {
		panic(err)
	}

	for _, de := range dir {
		func() {
			n := de.Name()
			id, err := strconv.Atoi(strings.TrimSuffix(n, ".png"))
			if err != nil {
				panic(err)
			}

			f, err := spriteData.Open(filepath.Join("assets/sprites", n))
			if err != nil {
				panic(err)
			}
			defer f.Close()

			img, _, err := image.Decode(f)
			if err != nil {
				panic(err)
			}

			ret[id] = img
		}()
	}

	return ret
}
