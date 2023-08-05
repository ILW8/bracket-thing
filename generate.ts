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

import {Transaction} from "typeorm";

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


// def create_winners(max_player):  # create the winners brackets
//     global winner_bracket, loser_matrix
//     exp = 2
//     current_limit = 4
//     while current_limit < max_player:
//         exp = exp + 1
//         current_limit = 2 ** exp
//         active_players = [i for i in range(1, current_limit + 1)]
//         a = active_players[:len(active_players) // 2]
//         b = active_players[len(active_players) // 2:]
//         b.reverse()
//         match_pairings = list(zip(a, b))
//         latest_depth_list = winner_bracket[current_limit // 2 // 2 * -1:]  # this way we only index winners
//         loser_subarr = []
//         for node_id in latest_depth_list:
//             for match in match_pairings:
//                 if any(x in list(match) for x in g.nodes[node_id]["players"]):  # if they share any members, add an edge
//                     loser_subarr.append(match[1])
//                     id = create_node(list(match), True)
//                     g.add_edge(id, node_id)
//
//         loser_matrix.append(loser_subarr)

function zip<TypeLeft, TypeRight>(left: TypeLeft[], right: TypeRight[]) {
    return left.map((element, idx) => [element, right[idx]]);
}

function intDiv(numerator: number, denominator: number) : number {
    return Math.floor(numerator/denominator);
}

/**
 * Builds the winner bracket
 * @param playerCount how many players/teams in the bracket
 */
function buildWinners(playerCount: number) {
    let exponent = 2;
    let currentLimit = 4;

    while (currentLimit < playerCount) {
        exponent++;
        currentLimit = Math.pow(2, exponent);
        let activePlayers = [...Array(currentLimit).keys()].map(n => n+1);

        let firstHalfPlayers = activePlayers.slice(0, Math.floor(activePlayers.length / 2));
        let secondHalfPlayers = activePlayers.slice(Math.floor(activePlayers.length / 2));
        secondHalfPlayers.reverse();

        let matchPairings = zip<number, number>(firstHalfPlayers, secondHalfPlayers);
        let latestDepthList = winnerBracketNodes.slice(intDiv(intDiv(currentLimit, 2), 2) * -1)
        let loserSubArray: number[] = []; // what are these names

        // UGLYYYY
        for (const node of latestDepthList) {
            for (const match of matchPairings) {
                for (const player of node.players){
                    if (match.includes(player)) {
                        loserSubArray.push(match[1]);
                        let id = makeNode(match, true);
                        MatchNode.makeDirectedEdge(id, node.ID);
                    }
                }
            }
        }

        losersMatrix.push(loserSubArray);
    }



}
