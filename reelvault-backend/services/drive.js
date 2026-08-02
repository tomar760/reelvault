/* ReelVault — Google Drive service (folders tree + upload + move)
   OAuth (user identity) ho toh wahi use hota hai — warna service account (read-only-ish) */
const fs = require("fs");
const { driveClient } = require("./google");
const { CFG, SPECIAL_FOLDERS, slug } = require("../config");

const drv = () => driveClient().drive;
const folderCache = new Map(); // "parentId/name" -> folderId

async function findChildFolder(parentId, name) {
  const key = parentId + "/" + name;
  if (folderCache.has(key)) return folderCache.get(key);
  const q = `'${parentId}' in parents and name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const res = await drv().files.list({ q, fields: "files(id,name)", pageSize: 1 });
  if (res.data.files.length) { folderCache.set(key, res.data.files[0].id); return res.data.files[0].id; }
  return null;
}

async function createFolder(parentId, name) {
  const res = await drv().files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
    fields: "id",
  });
  folderCache.set(parentId + "/" + name, res.data.id);
  return res.data.id;
}

async function ensureFolder(parentId, name) {
  return (await findChildFolder(parentId, name)) || (await createFolder(parentId, name));
}

/* Build the whole tree once (and per new topic on demand) */
async function ensureTree(topicLabels) {
  const root = CFG.DRIVE_ROOT;
  const paths = {};
  for (const base of ["01_High_Importance", "02_Medium_Importance", "03_Low_Importance"]) {
    const baseId = await ensureFolder(root, base);
    paths[base] = { id: baseId, subs: {} };
    for (const t of topicLabels) {
      const s = slug(t);
      paths[base].subs[s] = await ensureFolder(baseId, s);
    }
  }
  for (const sp of SPECIAL_FOLDERS) paths[sp] = { id: await ensureFolder(root, sp), subs: {} };
  return paths;
}

/* Slightly share link (viewer by link) + web links */
async function shareAndGetLinks(fileId) {
  await drv().permissions.create({
    fileId, requestBody: { role: "reader", type: "anyone" },
  }).catch(() => {});
  const res = await drv().files.get({ fileId, fields: "id,name,size,webViewLink,thumbnailLink" });
  return res.data;
}

async function uploadVideo(localPath, fileName, parentFolderId) {
  const res = await drv().files.create({
    requestBody: { name: fileName, parents: [parentFolderId] },
    media: { body: fs.createReadStream(localPath) },
    fields: "id",
    supportsAllDrives: true,
  });
  return shareAndGetLinks(res.data.id);
}

async function uploadText(fileName, text, parentFolderId) {
  const tmp = `/tmp/${Date.now()}_${fileName}`;
  fs.writeFileSync(tmp, text, "utf8");
  try {
    const res = await drv().files.create({
      requestBody: { name: fileName, parents: [parentFolderId] },
      media: { mimeType: "text/plain", body: fs.createReadStream(tmp) },
      fields: "id",
    });
    return await shareAndGetLinks(res.data.id);
  } finally { try { fs.unlinkSync(tmp); } catch (e) {} }
}

async function moveFile(fileId, newParentId) {
  const file = await drv().files.get({ fileId, fields: "parents" });
  await drv().files.update({
    fileId,
    addParents: newParentId,
    removeParents: (file.data.parents || []).join(","),
    fields: "id,parents",
  });
}

async function renameFile(fileId, name) {
  await drv().files.update({ fileId, requestBody: { name } });
}

function fileIdFromLink(link) {
  const m = /\/d\/([a-zA-Z0-9_-]{20,})/.exec(link || "");
  return m ? m[1] : null;
}

module.exports = { ensureTree, ensureFolder, uploadVideo, uploadText, moveFile, renameFile, fileIdFromLink, shareAndGetLinks };
