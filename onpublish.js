import Handlebars from "https://jspm.dev/handlebars"
import RSS from "https://jspm.dev/rss"
import marked from "https://jspm.dev/marked"
export default async function (items, config, offbase) {
  let { fs } = offbase;
  let tds = await fs.promises.readFile(`${config.settings.THEME}/index.hbs`, "utf8")
  let tpl = Handlebars.compile(tds)
  await fs.promises.mkdir(`${config.settings.DEST}/pages`).catch((e) => { })
  let { index, pages } = await paginator(items, tpl, config)
  for(let i=0; i<pages.length; i++) {
    await fs.promises.mkdir(`${config.settings.DEST}/pages/${i+1}`).catch((e) => { })
    await fs.promises.writeFile(`${config.settings.DEST}/pages/${i+1}/index.html`, pages[i]).catch((e) => { })
  }
  await fs.promises.writeFile(`${config.settings.DEST}/index.html`, index)
  let b = await fs.promises.readFile(`${config.settings.THEME}/favicon.ico`)
  await fs.promises.writeFile(`${config.settings.DEST}/favicon.ico`, b)
  await fs.promises.writeFile(`${config.settings.ROOT}/CNAME`, config.settings.CNAME)
  await fs.promises.writeFile(`${config.settings.ROOT}/.nojekyll`, "", "utf8")
  await rss(items, config, offbase)
  return items
}
const paginator = (items, template, config) => {
  console.log("items = ", items)
  let pages = [];
  let counter = []
  for (let i=0; i<items.length; i+=config.settings.PAGE.CHUNK) {
    let page = items.slice(i, i + config.settings.PAGE.CHUNK)
    pages.push(page)
    counter.push({ number: i/config.settings.PAGE.CHUNK+1 })
  }
  let res = []
  let index;
  for(let i=0; i<pages.length; i++) {
    console.log("page = ", pages[i])
    counter[i].current = true;
    let html = template({
      title: config.settings.NAME,
      base: "../../",
      items: pages[i].map((item) => {
        return {
          filename: "post/" + item.key,
          meta: item.data
        }
      }),
      pages: counter
    })
    res.push(html)

    if (i === 0) {
      index = template({
        title: config.settings.NAME,
        base: "./",
        items: pages[i].map((item) => {
          return {
            filename: "post/" + item.key,
            meta: item.data
          }
        }),
        pages: counter
      })
    }
    counter[i].current = false;
  }
  return { index: index, pages: res }
}
const rss = async (items, config, offbase) => {
  let feed = new RSS()
  let feedItems = items.slice(0, config.settings.FEED.CHUNK)
  feedItems.forEach((item) => {
    let html;
    if (config.settings.BASE.length === 0) {
      html = marked(item.content, { baseUrl: "../../" })
    } else {
      html = marked(item.content, { baseUrl: config.settings.BASE })
    }
    feed.item({
      title: item.data.title,
      description: html,
      url: `${config.settings.BASE}post/${item.key}`,
      date: item.data.updated
    })
  })
  let xml = feed.xml({ indent: true });
  await offbase.fs.promises.writeFile(`${config.settings.DEST}/rss.xml`, xml)
}
