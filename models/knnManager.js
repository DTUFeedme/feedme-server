const IllegalArgumentError = require("../errors/IllegalArgumentError");

module.exports = class KnnManager {

    constructor(dimension, initialPoints, k) {
        if (dimension <= 0)
            throw new IllegalArgumentError("Dimensions should be at least 1");
        if (!initialPoints || initialPoints.length <= 0)
            throw new IllegalArgumentError("points should be at least one-length array");
        if (k === 0 || k > initialPoints.length)
            throw new IllegalArgumentError("length of points should at least be the length of k");

        this.validTypes = new Set();

        for (let i = 0; i < initialPoints.length; i++) {
            if (!initialPoints[i].vector)
                throw new IllegalArgumentError("point at index " + i +
                    " did not have vector array with at least 1 length");

            if (initialPoints[i].vector.length !== dimension)
                throw new IllegalArgumentError(`point ${JSON.stringify(initialPoints[i])} at index ${i} had vector with 
                dimension ${initialPoints[i].vector.length} which did not match required dimension ${dimension}`);

            if (initialPoints[i].type === undefined)
                throw new IllegalArgumentError("type of points at index " + i + " was not set");

            if (typeof initialPoints[i].type !== "string")
                throw new IllegalArgumentError("type of points at index " + i + " should be a string");

            this.validTypes.add(initialPoints[i].type);
        }

        this.points = initialPoints;
        this.dimension = dimension;
        this.k = k;
    }


    pointTypeEstimation(newPoint) {
        if (newPoint.type !== undefined)
            throw new IllegalArgumentError("New point should not have a type");

        let nearestPoints = this.nearestNeighbors(newPoint, this.points, this.k);

        let typeCounterMap = this.typeCountMap(nearestPoints);

        let certaintyMap = this.certaintyTypeMap(typeCounterMap);

        let k = this.k;

        let knnTied = this.isKnnTied(typeCounterMap);
        while (knnTied.tied) {
            k--;
            nearestPoints = this.nearestNeighbors(newPoint, nearestPoints, k);
            typeCounterMap = this.typeCountMap(nearestPoints);
            knnTied = this.isKnnTied(typeCounterMap);
        }

        return {
            type: knnTied.type,
            certainty: certaintyMap[knnTied.type]
        }
    }

    isKnnTied(typeCountMap) {
        let max = 0;
        let maxType;
        for (const [type, counter] of Object.entries(typeCountMap)) {
            if (counter > max) {
                max = counter;
                maxType = type;
            }
        }

        let maxCount = 0;

        if (max <= this.k / 2) {
            for (const [type, counter] of Object.entries(typeCountMap)) {
                if (counter === max) {
                    maxCount++;
                }
            }
        }

        return {
            tied: maxCount >= 2,
            type: maxType
        };
    }

    typeCountMap(points) {
        const typeCounterMap = {};
        for (let i = 0; i < points.length; i++) {
            if (points[i].type in typeCounterMap) {
                typeCounterMap[points[i].type]++;
            } else {
                typeCounterMap[points[i].type] = 1;
            }
        }
        return typeCounterMap;
    }

    certaintyTypeMap(typeCountMap) {
        const certaintyMap = {};
        for (const type in typeCountMap) {
            certaintyMap[type] = Math.round(100 * typeCountMap[type] / this.k);
        }
        return certaintyMap;
    }


    nearestNeighbors(newPoint, points, k) {
        const nearestPoints = new Array(k);

        points.sort((a, b) => this.calcDist(newPoint, a) - this.calcDist(newPoint, b));

        // Initialize nearest neighbors to first k elements of points
        for (let i = 0; i < k; i++) {
            nearestPoints[i] = points[i];
        }
        return nearestPoints;
    }

    minDistPoint(newPoint, points) {
        let minDist = Number.MAX_SAFE_INTEGER;
        let minDistIndex = -1;

        for (let i = 0; i < points.length; i++) {
            const newDist = this.calcDist(points[i], newPoint);
            if (newDist < minDist) {
                minDist = newDist;
                minDistIndex = i;
            }
        }
        return {index: minDistIndex, dist: minDist};
    }

    checkDimension(points) {
        for (let i = 0; i < points.length; i++) {
            if (!points[i].vector || points[i].vector.length !== this.dimension)
                throw new IllegalArgumentError("Point " + JSON.stringify(points[i])
                    + " with vector length " + points[i].vector.length
                    + " did not have required dimension " + this.dimension)
        }
    }

    calcDist(point1, point2) {
        this.checkDimension([point1, point2]);

        let sum = 0;
        for (let i = 0; i < this.dimension; i++) {
            sum += (point1.vector[i] - point2.vector[i]) ** 2;
        }
        return Math.sqrt(sum);
    }

    checkPointType(newPoint) {
        if (newPoint.type === undefined || !this.validTypes.has(newPoint.type))
            throw new IllegalArgumentError(`Point with type ${newPoint.type} is not valid`);

    }
};

