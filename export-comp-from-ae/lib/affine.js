// Algorithm adapted from https://stackoverflow.com/a/56228667/3128248
var pointsToAffineMatrix = (function() {
    function transpose(arr) {
        var outArr = [];
        for (var i = 0; i < arr[0].length; i++) {
            outArr.push([]);
        }
        for (var i = 0; i < arr.length; i++) {
            for (var j = 0; j < arr[i].length; j++) {
                outArr[j].push(arr[i][j]);
            }
        }
        return outArr;
    }

    // Adapted from gl-matrix
    // https://github.com/toji/gl-matrix/blob/d30bf3ba16449c2228a56754822059dd79d196a4/src/mat4.js#L416
    function det4x4(a) {
        var a00 = a[0][0],
            a01 = a[0][1],
            a02 = a[0][2],
            a03 = a[0][3];
        var a10 = a[1][0],
            a11 = a[1][1],
            a12 = a[1][2],
            a13 = a[1][3];
        var a20 = a[2][0],
            a21 = a[2][1],
            a22 = a[2][2],
            a23 = a[2][3];
        var a30 = a[3][0],
            a31 = a[3][1],
            a32 = a[3][2],
            a33 = a[3][3];

        var b0 = a00 * a11 - a01 * a10;
        var b1 = a00 * a12 - a02 * a10;
        var b2 = a01 * a12 - a02 * a11;
        var b3 = a20 * a31 - a21 * a30;
        var b4 = a20 * a32 - a22 * a30;
        var b5 = a21 * a32 - a22 * a31;
        var b6 = a00 * b5 - a01 * b4 + a02 * b3;
        var b7 = a10 * b5 - a11 * b4 + a12 * b3;
        var b8 = a20 * b2 - a21 * b1 + a22 * b0;
        var b9 = a30 * b2 - a31 * b1 + a32 * b0;

        // Calculate the determinant
        return a13 * b6 - a03 * b7 + a33 * b8 - a23 * b9;
    }

    function entry(row, delIndex, B) {
        var newMatrix = [row];
        for (var i = 0; i < B.length; i++) {
            if (i !== delIndex) newMatrix.push(B[i]);
        }
        return det4x4(newMatrix);
    }

    return function(ins, out) {
        var B = transpose(ins);
        B.push([1, 1, 1, 1]);

        var D = 1 / det4x4(B);

        var transposedOut = transpose(out);
        var M = [];
        for (var i = 0; i < transposedOut.length; i++) {
            for (var j = 0; j < 4; j++) {
                M.push((j % 2 === 0 ? 1 : -1) * D * entry(transposedOut[i], j, B));
            }
        }
        return M;
    }
})();
