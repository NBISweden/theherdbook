"""
Utility for parsing csv fetched from the R Api
"""

def parse_kinship(resp_content):
    """
    Parses a csv in order to return a dictionary with the kinship coefficients.
    """
    content_utf = resp_content.decode('utf-8')
    csv_list = [[val.strip() for val in r.split(",")] for r in content_utf.splitlines()]
    (header, *data) = csv_list
    csv_dict = {}
    for idx, row in enumerate(data):
        csv_dict[header[idx]] = dict(zip(header, map(float, row)))
    return csv_dict


def parse_csv(resp_content):
    """
    Parses a csv in order to return a dictionary.
    """
    content_utf = resp_content.decode('utf-8')
    csv_list = [[val.strip() for val in r.split(",")] for r in content_utf.splitlines()]
    (_, *data) = csv_list
    csv_dict = {}
    for row in data:
        key, *values = row
        csv_dict[key] = float(values[0])
    return csv_dict
