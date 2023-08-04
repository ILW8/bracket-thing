import networkx as nx
import matplotlib.pyplot as plt
from networkx.drawing.nx_pydot import graphviz_layout

g = nx.DiGraph()
playerarr = [i for i in range(1, 31)]
winner_bracket = []
loser_bracket = []
loser_matrix = [[2], [4, 3]]


def create_node(pl, w):  # create a node with the highest avaiable id and append it to the relevant list
    node_id = len(g.nodes) + 1
    g.add_node(node_id, players=pl, is_winner=w)
    if w:
        winner_bracket.append(node_id)
    else:
        loser_bracket.append(node_id)
    return node_id


# create an initial bracket, assuming 4 players and then hide as needed, DONT change the order of creation!
def init_finals():
    a = create_node([1, 2], True)
    b = create_node([1, 2], True)
    g.add_edge(b, a)

    b = create_node([2, 3], False)
    g.add_edge(b, a)
    g.add_edge(2, b)

    a = create_node([3, 4], False)
    g.add_edge(a, b)

    b = create_node([1, 4], True)
    g.add_edge(b, 2)

    b = create_node([2, 3], True)
    g.add_edge(b, 2)


def filter_nodes(max_player):  # remove all nodes which contain players above a certain maximum player
    delete_list = []
    for node in g.nodes:
        for player in g.nodes[node]["players"]:
            if player > max_player:
                delete_list.append(node)
    g.remove_nodes_from(delete_list)


def create_winners(max_player):  # create the winners brackets
    global winner_bracket, loser_matrix
    exp = 2
    current_limit = 4
    while current_limit < max_player:
        exp = exp + 1
        current_limit = 2 ** exp
        active_players = [i for i in range(1, current_limit + 1)]
        a = active_players[:len(active_players) // 2]
        b = active_players[len(active_players) // 2:]
        b.reverse()
        match_pairings = list(zip(a, b))
        latest_depth_list = winner_bracket[current_limit // 2 // 2 * -1:]  # this way we only index winners
        loser_subarr = []
        for node_id in latest_depth_list:
            for match in match_pairings:
                if any(x in list(match) for x in g.nodes[node_id]["players"]):  # if they share any members, add an edge
                    loser_subarr.append(match[1])
                    id = create_node(list(match), True)
                    g.add_edge(id, node_id)

        loser_matrix.append(loser_subarr)


def find_first_occ(player, bracket):
    for id in bracket:
        try:
            if player in g.nodes[id]["players"]:
                return id
        except:
            continue


def link_stragglers():
    for node in g.nodes:
        if not g.nodes[node]["is_winner"] and g.degree[node] < 3:
            if g.degree[node] == 2:
                g.add_edge(find_first_occ(g.nodes[node]["players"][1], winner_bracket), node)
            elif g.degree[node] == 1:
                g.add_edge(find_first_occ(g.nodes[node]["players"][0], winner_bracket), node)
                g.add_edge(find_first_occ(g.nodes[node]["players"][1], winner_bracket), node)


def make_cont_match(pairings, new_n, limit, max_p, bracket, e):
    # continued section from previous loser matches
    pairings[0].reverse()
    players = pairings.pop(0)
    cont_node = create_node(players, False)
    g.add_edge(cont_node, new_n)
    if limit >= max_p:  # if this is the final bracket limit
        linking_winner_matches = []
        for player in players:
            linking_winner_matches.append(find_first_occ(player, bracket))
        for link in linking_winner_matches:
            g.add_edge(link, cont_node)


def create_losers(max_player):
    global loser_bracket, loser_matrix, winner_bracket
    exp = 2
    current_limit = 4
    window = (0, 1)
    swap = False
    while current_limit < max_player:
        exp = exp + 1
        current_limit = 2 ** exp
        window = (window[0] + 1, window[1] + 1)
        match_pairings = []
        for x in range(0, len(loser_matrix[window[1]]), 2):
            match_pairings.append(list([loser_matrix[window[1]][x], loser_matrix[window[1]][x + 1]]))

        split = len(loser_matrix[window[1]]) // 2
        cont_winners = [min(match) for match in match_pairings]
        if swap:
            cont_winners.reverse()
            match_pairings.reverse()
        start_idx = len(loser_bracket) - (split - 1)
        for i in range(start_idx, len(loser_bracket), 2):
            selected_node = loser_bracket[i]
            # do the left first
            linking_player = min(g.nodes[selected_node]["players"])
            carry_player = cont_winners.pop(0)

            winner_node = find_first_occ(linking_player, winner_bracket)
            new_node = create_node([linking_player, carry_player], False)
            g.add_edge(new_node, selected_node)
            g.add_edge(winner_node, new_node)

            make_cont_match(match_pairings, new_node, current_limit, max_player, winner_bracket, exp)

            # now do the right
            linking_player = max(g.nodes[selected_node]["players"])
            carry_player = cont_winners.pop(0)

            winner_node = find_first_occ(linking_player, winner_bracket)
            new_node = create_node([linking_player, carry_player], False)
            g.add_edge(new_node, selected_node)
            g.add_edge(winner_node, new_node)

            make_cont_match(match_pairings, new_node, current_limit, max_player, winner_bracket, exp)
        swap = not swap


init_finals()
create_winners(playerarr[-1])
create_losers(playerarr[-1])
filter_nodes(playerarr[-1])
link_stragglers()
limits = plt.axis("off")
options = {"edgecolors": "tab:gray", "node_size": 3000, "alpha": 0.9}
labels = nx.get_node_attributes(g, 'players')
color_map = []
for node in g.nodes:
    if g.nodes[node]["is_winner"] == True:
        color_map.append("tab:blue")
    else:
        color_map.append("tab:red")

pos = graphviz_layout(g, prog="dot")
nx.draw_networkx(g, pos=pos, labels=labels, with_labels=True, node_shape='o', node_color=color_map, **options)
plt.show()
