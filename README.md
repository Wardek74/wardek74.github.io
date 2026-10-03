# wardek74.github.io

## Managing projects

The shared project list is in [`projects.json`](projects.json). To add, edit, remove, or reorder projects:

1. Open **Admin** at the bottom of the website and choose **Edit the shared project list on GitHub**.
2. Edit `projects.json`. Keep it as a JSON array; the order of entries is the order shown on the site.
3. Commit the change on GitHub. GitHub Pages will publish it for all visitors.

Add each project as an object in the JSON array:

```json
{
  "name": "My project",
  "url": "https://example.com/",
  "desc": "A short description",
  "icon": "",
  "accent": "#4db8ff"
}
```

`name` and `url` are required. `desc` is optional; use `descKey` instead for a built-in translated description.
