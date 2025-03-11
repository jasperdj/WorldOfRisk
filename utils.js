// Utility functions to replace Lodash.
// Todo: implement lodash
const _ = {
    shuffle: function(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    },
    times: function(n, iteratee) {
        const result = Array(n);
        for (let i = 0; i < n; i++) {
            result[i] = iteratee(i);
        }
        return result;
    },
    forEach: function(collection, iteratee) {
        if (Array.isArray(collection)) {
            for (let i = 0; i < collection.length; i++) {
                iteratee(collection[i], i, collection);
            }
        } else {
            for (const key in collection) {
                if (Object.prototype.hasOwnProperty.call(collection, key)) {
                    iteratee(collection[key], key, collection);
                }
            }
        }
        return collection;
    }
};

// Color utilities
const colorUtils = {
    darken: (color, percent) => {
        let r = parseInt(color.substring(1, 3), 16);
        let g = parseInt(color.substring(3, 5), 16);
        let b = parseInt(color.substring(5, 7), 16);
        r = Math.floor(r * (100 - percent) / 100);
        g = Math.floor(g * (100 - percent) / 100);
        b = Math.floor(b * (100 - percent) / 100);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    },
    lighten: (color, percent) => {
        let r = parseInt(color.substring(1, 3), 16);
        let g = parseInt(color.substring(3, 5), 16);
        let b = parseInt(color.substring(5, 7), 16);
        r = Math.min(255, Math.floor(r * (100 + percent) / 100));
        g = Math.min(255, Math.floor(g * (100 + percent) / 100));
        b = Math.min(255, Math.floor(b * (100 + percent) / 100));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    },
    isDark: (color) => {
        const r = parseInt(color.substring(1, 3), 16);
        const g = parseInt(color.substring(3, 5), 16);
        const b = parseInt(color.substring(5, 7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness < 128;
    }
};

// Helper functions using lodash
const shuffleArray = arr => _.shuffle(arr);