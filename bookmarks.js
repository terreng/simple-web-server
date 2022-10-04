let mas_bookmarks = {};

function addToSecurityScopedBookmarks(filepath, bookmark) {
    if (bookmark && bookmark.length > 0) {
        mas_bookmarks[filepath] = {"bookmark": bookmark};
        try {
        	fs.writeFileSync(path.join(app.getPath('userData'), "mas_bookmarks.json"), JSON.stringify(mas_bookmarks, null, 2));
        } catch(e) {
            console.error(e);
        }
    }
}

// Provide path, returns bookmark
function matchSecurityScopedBookmark(filepath) {
    const matching_bookmarks = Object.keys(mas_bookmarks).filter(function(a) {
        return filepath.startsWith(a) && (filepath.length === a.length || ["/","\\"].indexOf(filepath.substring(a.length,a.length+1)) > -1);
    });
    if (matching_bookmarks.length > 0) {
        const longest_matching_bookmark = matching_bookmarks.reduce(function(a, b) {return a.length > b.length ? a : b;});
        return mas_bookmarks[longest_matching_bookmark].bookmark;
    } else {
        return null;
    }
}

// Provide path, accesses and then returns bookmark
function matchAndAccessSecurityScopedBookmark(filepath) {
    const bookmark = matchSecurityScopedBookmark(filepath);
    accessSecurityScopedBookmark(bookmark);
    return bookmark;
}

let in_use_mas_bookmarks = {};

// Accesses bookmark
function accessSecurityScopedBookmark(bookmark) {
    if (!bookmark) return;
    if (in_use_mas_bookmarks[bookmark]) {
        in_use_mas_bookmarks[bookmark].count++;
    } else {
        const stopAccessing = app.startAccessingSecurityScopedResource(bookmark);
        in_use_mas_bookmarks[bookmark] = {
            count: 1,
            stopAccessing: stopAccessing
        };
    }
}

// Release bookmark
function releaseSecurityScopedBookmark(bookmark) {
    if (!bookmark) return;
    if (in_use_mas_bookmarks[bookmark]) {
        in_use_mas_bookmarks[bookmark].count--;
        if (in_use_mas_bookmarks[bookmark].count === 0) {
            in_use_mas_bookmarks[bookmark].stopAccessing();
            delete in_use_mas_bookmarks[bookmark];
        }
    } else {
        throw new Error("Attempting to release security scoped bookmark that wasn't accessed");
    }
}

module.exports = {
    add: addToSecurityScopedBookmarks,
    match: matchSecurityScopedBookmark,
    matchAndAccess: matchAndAccessSecurityScopedBookmark,
    access: accessSecurityScopedBookmark,
    release: releaseSecurityScopedBookmark,
    bookmarks: mas_bookmarks
}
