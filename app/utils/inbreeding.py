"""
Inbreeding coefficent calculations from the Herdbook's database records.
The Malecot coefficient of coancestry of the two parents is calculated.
"""

from pydigree.population import Population
from pydigree.pedigree import Pedigree
from pydigree.io.base import PEDRecord
from pydigree.io.base import connect_individuals, sort_pedigrees
from . import data_access as data_access
import pygraphviz
from .database import User



class IndividualPEDRecord(PEDRecord): #pylint: disable=too-few-public-methods
    """
    Class that encapsulates an individual's pedigree information.

    :param PEDRecord: Base class corresponding to a pydigree PEDRecord
    :type PEDRecord: class
    """
    def __init__(self, individual): #pylint: disable=super-init-not-called
        """
        Creates pedigree record from a dictionary of an individual

        :param individual: A dictionary containing an individuals info
        :type individual: dict
        """
        self.ind_id = individual["id"]
        self.fam = "0"
        self.fa = individual["father"]
        self.mo = individual["mother"]
        self.sex = individual["sex"]
        self.aff = individual["phenotype"]


def calculate_inbreeding(ped):
    """
    Calculate the inbreeding coefficient of a set of individuals.

    :param ped: A pydigree collection of pedigrees
    :type ped: pydigree.pedigreecollection.PedigreeCollection
    :return: A dictionary containing the coefficient and the id of the individual
    :rtype: dict[str]str
    """
    coefficients = dict()

    for pedigree in ped.pedigrees:
        ids = sorted([x.label for x in pedigree.individuals])

        for i_id in ids:
            coefficients[i_id] = pedigree.inbreeding(i_id)

    return coefficients


def get_pedigree_collections():
    """
    Fetch a collection of individuals from the database and return a collection of pedigrees.

    :return: A collection of pedigrees
    :rtype: pydigree.pedigreecollection.PedigreeCollection
    """

    affected_labels = {'1': 0, '2': 1, 'A': 1, 'U': 0,
                       'X': None, '-9': None}

    population_handler = lambda *x: None

    population = Population()
    ped = Pedigree()
    population_handler(ped)

    # Step 1: Fetch the data from the db and create the individuals
    individuals = data_access.get_all_individuals()

    for i in individuals:
        rec = IndividualPEDRecord(i)
        ind = rec.create_individual(population)
        ind.pedigree = ped
        ind.phenotypes['affected'] = affected_labels.get(rec.aff, None)
        ped[ind.label] = ind

    # Step 2: Create between-individual relationships
    connect_individuals(ped)

    # Step 3: Separate the individuals into pedigrees
    sorted_ped = sort_pedigrees(ped.individuals, population_handler)

    return sorted_ped

def get_graph(id, user_id, coefficients):
    G = pygraphviz.AGraph(directed=True, strict=True)
    G.node_attr['shape']= 'box'
    G.node_attr['color']= 'yellow'
    G.node_attr['style'] = 'filled'
    add_node(id, G, user_id, coefficients)
    graph_file = "graphs/graph-%s.png" % id
    # print(ped.inbreeding(x.label))
    G.layout()
    G.write(graph_file)
    G.draw(graph_file)
    return graph_file

def add_node(id, G, uuid, coefficients):
    x = data_access.get_individual(individual_id=id, user_uuid=uuid)
    if x is None:
        return
    id = str(id)
    print(id)
    coefficient = coefficients[id]
    label = "%s"% (id)
    G.add_node(id)
    if x['father']:
        father = x['father']
        G.add_edge(father['id'], id)
        add_node(father['id'], G, uuid, coefficients)
    if x['mother']:
        mother = x['mother']
        G.add_edge(mother['id'], id)
        add_node(father['id'], G, uuid, coefficients)

def main():
    """
    Run the main program.
    """
    user = User.get(User.email == 'airen@nbis.se')
    collections = get_pedigree_collections()
    coefficients = calculate_inbreeding(collections)
    get_graph(10000, user.uuid, coefficients)


if __name__ == "__main__":
    main()
