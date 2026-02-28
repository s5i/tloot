//go:build js && wasm

package main

import (
	"bytes"
	"context"
	"fmt"
	"image"
	_ "image/png"
	"syscall/js"

	"github.com/s5i/tloot/process"
)

func main() {
	items := process.LoadItems()
	sprites := process.LoadSprites()

	namespace := js.Global().Get("tlootWASM")
	namespace.Set("imageBytesCallback", js.FuncOf(func(this js.Value, args []js.Value) any {
		ctx := context.Background()

		if len(args) != 1 {
			return fmt.Errorf("wrong number of arguments")
		}

		bLen := args[0].Length()
		if bLen == 0 {
			return fmt.Errorf("non-array argument")
		}

		b := make([]byte, bLen)
		js.CopyBytesToGo(b, args[0])
		bRead := bytes.NewReader(b)

		img, _, err := image.Decode(bRead)
		if err != nil {
			return fmt.Errorf("failed to decode image: %v", err)
		}

		res, err := process.Serial(ctx, img, items, sprites)
		if err != nil {
			return fmt.Errorf("failed to process image: %v", err)
		}

		total := 0
		for _, r := range res {
			if r.Count != 0 {
				if r.Item.Value != 0 {
					fmt.Printf("%s: %d x %d gp = %d gp\n", r.Item.Name, r.Count, r.Item.Value, r.Count*r.Item.Value)
				} else {
					fmt.Printf("%s: %d x [PLAYER PRICE]\n", r.Item.Name, r.Count)
				}
				total += r.Count * r.Item.Value
			}
		}
		fmt.Printf("Total: %d gp\n", total)

		return nil
	}))

	fmt.Println("WASM callbacks registered.")

	// Never exit.
	<-(make(chan struct{}))
}
