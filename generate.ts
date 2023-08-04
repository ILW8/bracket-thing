// naive re-implementation of python script


/*

import networkx as nx
import matplotlib.pyplot as plt
from networkx.drawing.nx_pydot import graphviz_layout

g = nx.DiGraph()
playerarr = [i for i in range(1, 31)]
winner_bracket = []
loser_bracket = []
loser_matrix = [[2], [4, 3]]

*/

const PLAYER_COUNT = 16;

let players: number[] = [...Array(PLAYER_COUNT).keys()];

// contains node IDs
let nodesMap: { [key: number]: MatchNode } = {};
let allNodes: MatchNode[] = [];
let winnerBracketNodes: MatchNode[] = [];
let loserBracketNodes: MatchNode[] = [];
let losersMatrix: number[][] = [[2], [4, 3]];  // must initially be seeded with [[2], [4, 3]]


// g.add_node(node_id, players=pl, is_winner=w)
/**
 * these nodes are meant for use in a directed graph
 */
class MatchNode {
    public parent: MatchNode = null;

    constructor(public ID: number, public players: number[], public isWinner: boolean) {
    }

    public static makeDirectedEdge(parentNodeID: number, childNodeID: number) {  // for readability purposes
        // childNode.parent = parentNode;
        nodesMap[childNodeID].parent = nodesMap[parentNodeID];
    }


}

function makeNode(players: number[], isWinner: boolean) {
    const newNodeID = allNodes.length + 1;
    const newNode = new MatchNode(newNodeID, players, isWinner);

    (isWinner ? winnerBracketNodes : loserBracketNodes).push(newNode)
    allNodes.push(newNode);
    nodesMap[newNodeID] = newNode;

    return newNodeID;
}


// # create an initial bracket, assuming 4 players and then hide as needed, DONT change the order of creation!
// def init_finals():
//     a = create_node([1, 2], True)
//     b = create_node([1, 2], True)
//     g.add_edge(b, a)
//
//     b = create_node([2, 3], False)  # c
//     g.add_edge(b, a)
//     g.add_edge(2, b)
//
//     a = create_node([3, 4], False)  # d
//     g.add_edge(a, b)  # d, c
//
//     b = create_node([1, 4], True)  # e
//     g.add_edge(b, 2)  # e, b
//
//     b = create_node([2, 3], True)  # f
//     g.add_edge(b, 2)  # f, b

// make the root of the tree (start with finals)
function createTreeRoot() {
    // wtf do these letters mean? wtf is a b c d e f????
    const a = makeNode([1, 2], true);
    const b = makeNode([1, 2], true);
    MatchNode.makeDirectedEdge(a, b);

    const c = makeNode([2, 3], false);
    MatchNode.makeDirectedEdge(c, a);
    MatchNode.makeDirectedEdge(b, c);

    const d = makeNode([3, 4], false);
    MatchNode.makeDirectedEdge(d, c);

    const e = makeNode([1, 4], true);
    MatchNode.makeDirectedEdge(e, b);

    const f = makeNode([2, 3], true);
    MatchNode.makeDirectedEdge(f, b);
}


// def filter_nodes(max_player):  # remove all nodes which contain players above a certain maximum player
//     delete_list = []
//     for node in g.nodes:
//         for player in g.nodes[node]["players"]:
//             if player > max_player:
//                 delete_list.append(node)
//     g.remove_nodes_from(delete_list)
/**
 *
 * @param maxSeed maximum seed to include (inclusive)
 */
function filterBySeed(maxSeed: number) {
    // for (const a of allNodes) {
    //     console.log(a);
    //     if (a.players.some(playerSeed => playerSeed > maxSeed)) {
    //
    //     }
    // }
    for (let idx = allNodes.length; idx > 0; idx--) {
        if (allNodes[idx].players.some(playerSeed => playerSeed > maxSeed)) {
            allNodes.splice(idx, 1); // remove element in-place

            // remove edge to this node
            for (const node of allNodes) {
                if (node.parent == nodesMap[idx]) {
                    node.parent = null;
                }
            }

            delete nodesMap[idx]; // remove from mapping
        }
    }
}


let a = new MatchNode(120, [1], false);
