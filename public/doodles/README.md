# Doodles

Every icon and drawing in posted. comes from this folder. The files here now are
placeholders. Replace any of them with your own drawing and keep the same file name.

## Rules for a drawing file

- SVG (preferred) or a transparent PNG.
- Draw in black. The app recolors each drawing with the person's ink using a CSS mask,
  so only the shape matters, not the color.
- Icons use a square canvas (the placeholders are `viewBox="0 0 24 24"`). Illustrations
  such as `empty-today.svg` can be any shape.
- Keep the file to just the drawing: no background rectangle, no white fill.

## Names

| Prefix     | Used for                                    |
| ---------- | ------------------------------------------- |
| `nav-`     | the four navigation icons                   |
| `weather-` | My day moods                                |
| `nb-`      | notebook doodles (any new `nb-` file will appear in the notebook picker) |
| `empty-`   | empty-state illustrations                   |
| no prefix  | interface icons: `heart`, `mic`, `camera`, `pen`, `plus`, `close`, `more`, `check`, `back`, `down`, `postmark-lines` |

## Using one in code

```tsx
<Doodle name="heart" size={20} />
```

If you draw several versions of the same thing (for example `heart-1.svg`, `heart-2.svg`,
`heart-3.svg`), pass `variants={3}` and a `seed` (such as the post id). The same post
will always get the same version.
