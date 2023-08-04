import * as graphviz from "graphviz";

let ID = 1;

enum StageType {
    SingleElimination,
    DoubleElimination,
    RoundRobin,
}

interface RoundRobinInfo {
    repeats: number;
    groupSize: number;
}

class StageTree {

    parentNodes: MatchNode[] = [];
    teams: Team[] = [];

    constructor (private initialSize: number, private finalSize: number, private stageType: StageType, private roundRobinInfo?: RoundRobinInfo) {
        if (!Number.isInteger(initialSize) || !Number.isInteger(finalSize))
            throw new Error("Initial size and final size must be whole numbers");

        if ((this.stageType === StageType.SingleElimination || this.stageType === StageType.DoubleElimination) && this.finalSize > this.initialSize / 2)
            throw new Error("Final size must be less than half of initial size");

        if (this.stageType === StageType.RoundRobin) {
            if (!this.roundRobinInfo)
                throw new Error("Round robin info must be provided for round robin stage type");

            if (this.roundRobinInfo.groupSize > this.initialSize)
                throw new Error("Group size cannot be larger than initial size");
        }

        this.teams = Array.from({length: this.initialSize}, (_, i) => new Team(i + 1));

        this.generateNodes();
    }

    generateNodes () {

        // Recursively generate children for each node. The number of nodes each depth should x2 until it reaches the largest power of 2 smaller than the initial size
        const generateChildren = (parent: MatchNode, size: number): MatchNode[] => {
            if (size >= Math.pow(2, Math.floor(Math.log2(this.initialSize))))
                return [];

            const children: MatchNode[] = [];
            for (let i = 0; i < 2; i++) {
                const child = new MatchNode(ID++, [parent]);
                child.depth = parent.depth + 1;
                child.previousMatches = generateChildren(child, size * 2);
                children.push(child);
            }
            return children;
        };

        // Create the initial parent nodes based on final size and stage type, and generate their children
        const parentNodeCount = this.stageType === StageType.DoubleElimination ? Math.max(1, Math.floor(this.finalSize / 2)) : this.finalSize;
        for (let i = 0; i < parentNodeCount; i++) {
            const match = new MatchNode(ID++);
            match.previousMatches = generateChildren(match, parentNodeCount * 2);
            this.parentNodes.push(match);
        }

        let extraMatches = this.initialSize - Math.pow(2, Math.floor(Math.log2(this.initialSize)));
        // Go to the lowest depth, and assign the remaining required matches to the nodes at that depth to account for the initial size not being a power of 2
        let skip = false;
        const createRemainingMatches = (node: MatchNode, lower: boolean) => {
            if (!node.isLeaf()) {
                node.previousMatches.forEach(child => createRemainingMatches(child, lower));
                return;
            }

            if (extraMatches === 0)
                return;

            if (skip) {
                skip = false;
                return;
            }

            const match = new MatchNode(ID++, [node]);
            match.isLowerBracket = lower;
            match.depth = node.depth + 1;
            node.previousMatches.push(match);
            skip = true;
            extraMatches--;
        };

        while (extraMatches > 0)
            this.parentNodes.forEach(node => createRemainingMatches(node, false));

        // If the stage is double elimination, then create the lower bracket
        if (this.stageType === StageType.DoubleElimination) {
            const lowerParentNodes: MatchNode[] = [];

            const generateChildren = (parent: MatchNode, size: number, repeat: boolean): MatchNode[] => {
                if (!repeat && size >= Math.pow(2, Math.floor(Math.log2(this.initialSize)) - 1))
                    return [];

                const children: MatchNode[] = [];
                for (let i = 0; i < (repeat ? 1 : 2); i++) {
                    const child = new MatchNode(ID++, [parent]);
                    child.isLowerBracket = true;
                    child.depth = parent.depth + 1;
                    child.previousMatches = generateChildren(child, !repeat ? size : size * 2, !repeat);
                    children.push(child);
                }
                return children;
            };

            for (let i = 0; i < parentNodeCount; i++) {
                const match = new MatchNode(ID++);
                match.isLowerBracket = true;
                match.previousMatches = generateChildren(match, parentNodeCount, true);
                lowerParentNodes.push(match);
            }

            extraMatches = this.initialSize - Math.pow(2, Math.floor(Math.log2(this.initialSize)));
            if (extraMatches > 0)
                lowerParentNodes.forEach(node => createRemainingMatches(node, true));

            // If final size is 1, then move every single node down 1 depth, and add a new root node on top at depth 1
            if (this.finalSize === 1) {
                const newRoot = new MatchNode(ID++, []);
                newRoot.previousMatches = this.parentNodes;
                newRoot.depth = 1;
                const moveDown = (node: MatchNode) => {
                    node.depth++;
                    node.previousMatches.forEach(child => moveDown(child));
                };
                newRoot.previousMatches.forEach(node => moveDown(node));
                this.parentNodes.forEach(node => node.nextMatches = [newRoot]);
                this.parentNodes = [newRoot];
            }

            this.parentNodes.push(...lowerParentNodes);

            this.connectBrackets();
        }

    }

    connectBrackets () {
        const flattenTree = (node: MatchNode) => {
            const result: MatchNode[] = [];
            const queue: MatchNode[] = [node];
            let swap = true;

            while (queue.length > 0) {
                const levelSize = queue.length;
                const levelQueue: MatchNode[] = [];
                for (let i = 0; i < levelSize; i++) {  // for each node at current level, push their antecedents to levelQueue
                    const currentNode = swap ? queue.shift() : queue.pop();
                    // levelQueue.push(...(swap ? currentNode.previousMatches.slice().reverse() : currentNode.previousMatches));
                    // if (!swap) {
                    //     levelQueue.unshift(...currentNode.previousMatches);
                    //
                    // } else {
                    //     levelQueue.push(...currentNode.previousMatches);
                    // }
                    levelQueue.push(...currentNode.previousMatches);

                    result.push(currentNode);
                }
                queue.push(...(swap ? levelQueue.reverse() : levelQueue));  // not sure what the swap logic is used for, I'm sure it has its use _somehow_
                swap = !swap;
            }

            return result;
        };
        const winnerNodes: MatchNode[] = this.parentNodes.filter(node => !node.isLowerBracket
        ).map(node => {
            return node.previousMatches.length === 1 ? node.previousMatches[0] : node;
        }).flatMap(node => {
            const a = flattenTree(node);
            console.log(a);
            return a;
        });
        const loserNodes: MatchNode[] = this.parentNodes.filter(node => node.isLowerBracket);

        // const shuffle = (array: MatchNode[]) => {
        //     return array.map((a) => ({ sort: Math.random(), value: a }))
        //         .sort((a, b) => a.sort - b.sort)
        //         .map((a) => a.value);
        // };
        //
        // winnerNodes = shuffle(winnerNodes);

        const queue = [...loserNodes];

        console.log(winnerNodes);

        while (queue.length > 0) {
            const currentNode = queue.shift();
            while (currentNode.previousMatches.length < 2) {
                const i = winnerNodes.findIndex(winnerNode => winnerNode.nextMatches.length < 2);  // todo: the order in which this is picking a matching winners match is wrong
                if (i === -1)
                    return;

                currentNode.previousMatches.push(winnerNodes[i]);
                winnerNodes[i].nextMatches.push(currentNode);
            }
            queue.push(...currentNode.previousMatches.filter(node => node.isLowerBracket));
        }

        if (this.finalSize === 1) {
            this.parentNodes.filter(node => !node.isLowerBracket)[0].previousMatches.push(this.parentNodes.filter(node => node.isLowerBracket)[0]);
            this.parentNodes.filter(node => node.isLowerBracket)[0].nextMatches.push(this.parentNodes.filter(node => !node.isLowerBracket)[0]);
        }
    }

    // generateBrackets (): [Team, Team?][] {
    //     // Create a list of teams
    //     const teams: Team[] = Array.from({length: this.initialSize}, (_, i) => ({ID: i + 1}));
    //
    //     // Find the largest power of 2 less than or equal to the number of teams
    //     const base_number = 2 ** Math.floor(Math.log2(this.initialSize));
    //
    //     // Divide the teams into two groups: initial teams that form the largest complete binary tree,
    //     // and remaining teams that need to be added to the matchups
    //     const initial_teams = teams.slice(0, base_number);
    //     const remaining_teams = teams.slice(base_number);
    //
    //     // Create the initial matchups from the initial teams
    //     let matchups: [Team, Team?][] = [];
    //     for (let i = 0; i < base_number / 2; i++) {
    //         matchups.push([initial_teams[i], initial_teams[base_number - (i + 1)]]);
    //     }
    //
    //     // Rearrange the matchups such that the teams with the best seedings are as far apart as possible
    //     const first: [Team, Team?][] = [];
    //     const last: [Team, Team?][] = [];
    //     let switchFlag = false;
    //     for (let i = 0; i < matchups.length; i++) {
    //         if (switchFlag)
    //             last.push(matchups[i]);
    //         else
    //             first.push(matchups[i]);
    //
    //         if (i % 2 == 0)
    //             switchFlag = !switchFlag;
    //     }
    //     matchups = first.concat(last.reverse());
    //
    //     // Add the remaining teams to the matchups
    //     for (let i = 0; i < remaining_teams.length; i++) {
    //         // Find the index of the matchup that contains the team with the best seeding
    //         const j = matchups.findIndex(matchup =>
    //             matchup[0].ID == i + 1 || (matchup.length > 1 && matchup[1]?.ID == i + 1)
    //         );
    //
    //         // Replace the worst seed in the already created matchup
    //         matchups[j] = matchups[j].filter(matchup => matchup.ID == i + 1) as [Team, Team?];
    //
    //         // Create a new match with the remaining team and the next worst seed available
    //         matchups.splice(
    //             j + 1,
    //             0,
    //             [{ID: remaining_teams[i].ID - i * 2 - 1}, {ID: remaining_teams[i].ID}]
    //         );
    //     }
    //
    //     return matchups;
    // }

    seedTeams () {
        const matchups: [Team, Team?][] = [
            [new Team(1)],
            [new Team(16), new Team(17)],
            [new Team(8), new Team(9)],
            [new Team(4), new Team(13)],
            [new Team(5), new Team(12)],
            [new Team(2), new Team(15)],
            [new Team(7), new Team(10)],
            [new Team(3), new Team(14)],
            [new Team(6), new Team(11)],
        ];
        console.log(matchups);

        // Go to the lowest depth and start seeding from there
        const extraMatches = this.initialSize - Math.pow(2, Math.floor(Math.log2(this.initialSize))) > 0;
        const getLowestDepth = (node: MatchNode): number => {
            if (node.isLeaf())
                return node.depth;
            return Math.max(...node.previousMatches.map(child => getLowestDepth(child)));
        };

        let index = 0;
        const seed = (node: MatchNode, depth: number) => {
            if (node.isLowerBracket)
                return;

            if (node.depth >= depth)
                node.teams = matchups[index++];

            if (!node.isLeaf())
                node.previousMatches.forEach(child => seed(child, depth));
        };

        this.parentNodes.filter(node => !node.isLowerBracket).forEach(node => seed(node, extraMatches ? getLowestDepth(node) - 1 : getLowestDepth(node)));

    }

    winTeams () {
        // Go to the lowest depth and start seeding from there, have the lower number win each time
        const teamAdvancement = (node: MatchNode, winner: boolean): Team => {
            if (node.teams?.length === 2)
                return node.teams.find(team =>
                    winner ?
                        team.ID === Math.min(...node.teams.map(team => team.ID)) :
                        team.ID === Math.max(...node.teams.map(team => team.ID))
                );

            const teams = node.previousMatches.map(child => teamAdvancement(
                child,
                !(node.isLowerBracket && !child.isLowerBracket)
            ));

            if (node.teams)
                console.log(node, teams);

            if ([...(node.teams || []), ...teams].length !== 2) {
                console.log(node);
                throw new Error("WHAT THE FUCK!!!!!");
            }

            if (node.teams)
                node.teams = [...node.teams, ...teams] as [Team, Team?];
            else
                node.teams = teams as [Team, Team?];

            return node.teams.find(team =>
                winner ?
                    team.ID === Math.min(...node.teams.map(team => team.ID)) :
                    team.ID === Math.max(...node.teams.map(team => team.ID))
            );
        };
        this.parentNodes.forEach(node => {
            const teams = node.previousMatches.map(child => teamAdvancement(child, node.isLowerBracket && !child.isLowerBracket ? false : true));
            if (teams.length > 2) {
                console.log(node);
                throw new Error("WHAT THE FUCK!!!!!");
            }
            node.teams = teams as [Team, Team?];
        });
    }

    visualizeTree (nodes = this.parentNodes) {
        const g = graphviz.digraph("G");

        const trackedEdges: { [key: string]: boolean } = {};

        // Assuming MatchNode has a property 'children' that is an array of MatchNode and a 'value' property
        const addNodes = (node: MatchNode, graphNode: graphviz.Node) => {
            node.previousMatches.forEach(child => {
                const childNode = g.getNode(child.ID.toString()) || g.addNode(child.ID.toString(), {
                    label: child.teams ? `${child.ID.toString()} (d: ${child.depth}): ` + child.teams.map(team => team.ID).join(" vs ") : `${child.ID.toString()} (d: ${child.depth})`,
                    color: child.previousMatches.length > 1 ? (node.isLowerBracket || child.isLowerBracket ? "red" : "black") : "green",
                });
                if (!trackedEdges[`${node.ID}-${child.ID}`])
                    g.addEdge(graphNode, childNode, {
                        color: node.isLowerBracket || child.isLowerBracket ? "red" : "black",
                        dir: "back",
                    });
                trackedEdges[`${node.ID}-${child.ID}`] = true;
                addNodes(child, childNode);
            });
        };

        nodes.forEach(node => {
            const graphNode = g.addNode(node.ID.toString(), {
                label: node.teams ? node.ID.toString() + ": " + node.teams.map(team => team.ID).join(" vs ") : `${node.ID.toString()} (d: ${node.depth})`,
                color: node.isLowerBracket ? "red" : "black",
            });
            addNodes(node, graphNode);
        });

        // console.log(g.to_dot());

        g.setGraphVizPath("/opt/homebrew/Cellar/graphviz/8.0.5/bin/");
        g.output("png", "test.png");
    }
}

class MatchNode {
    previousMatches: MatchNode[] = [];
    nextMatches: MatchNode[];
    depth = 1;
    isLowerBracket = false;
    teams?: [Team, Team?];

    constructor (public ID: number, parentNodes?: MatchNode[]) {
        this.nextMatches = parentNodes ?? [];
    }

    isLeaf () {
        return this.previousMatches.length === 0;
    }
}

class Team {
    constructor (public ID: number) {
    }
}

const tree = new StageTree(17, 1, StageType.DoubleElimination);
tree.seedTeams();
tree.winTeams();
tree.visualizeTree();
