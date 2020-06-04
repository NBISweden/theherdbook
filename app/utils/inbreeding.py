"""
Inbreeding coefficent calculations from the Herdbook's database records.
The inbreeding coefficient is the Malecot coefficient of coancestry of the two parents of an individual.
"""

from pydigree.population import Population
from pydigree.individual import Individual
from pydigree.pedigree import Pedigree
from pydigree.io.base import PEDRecord
from pydigree.io.base import connect_individuals, sort_pedigrees
import utils.database as database


class IndividualPEDRecord(PEDRecord):
    def __init__(self, individual):
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
        lab = pedigree.label
        ids = sorted([x.label for x in pedigree.individuals])

        for x in ids:
            coefficients[x] = pedigree.inbreeding(x)

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
    p = Pedigree()
    population_handler(p)

    # Step 1: Fetch the data from the db and create the individuals
    individuals = database.get_all_individuals()

    for i in individuals:
        rec = IndividualPEDRecord(i)
        ind = rec.create_individual(population)
        ind.pedigree = p
        ind.phenotypes['affected'] = affected_labels.get(rec.aff, None)
        p[ind.label] = ind

    # Step 2: Create between-individual relationships
    connect_individuals(p)

    # Step 3: Separate the individuals into pedigrees
    pc = sort_pedigrees(p.individuals, population_handler)

    return pc


def main():
    """
    Run the main program.
    """
    collections = get_pedigree_collections()
    coefficients = calculate_inbreeding(collections)
    print(coefficients)


if __name__ == "__main__":
    main()
