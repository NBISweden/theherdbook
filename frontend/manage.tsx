/**
 * @file This file contains the Manage function. This function is used for
 * granting and revoking permissions from users, as well as approving requests
 * for adding individuals to herds in the genebanks you manage.
 */
import React from 'react'
import Breadcrumbs from '@material-ui/core/Breadcrumbs';
import Typography from '@material-ui/core/Typography';

import { useUserContext } from './user_context'
import { get } from './communication';

/**
 * Provides genebanks management forms for granting and revoking herd
 * permissions, and managing herd animals.
 */
export function Manage() {
  const {user} = useUserContext();
  const [genebanks, setGenebanks] = React.useState([] as any[])
  const [genebank, setGenebank] = React.useState(undefined as any)

  function selectGenebank(id: number) {
    get(`/api/genebank/${id}`).then(
      data => data && setGenebank(data),
      error => console.error(error)
    );
  }

  React.useEffect(() => {
    get('/api/genebanks').then(
      data => {
        if (!data) {
          return;
        }
        setGenebanks(data);
        selectGenebank(data[0].id);
      },
      error => console.error(error)
    );
  }, [user])

  return <>
    <h2>Administrera</h2>
    <Breadcrumbs separator="&bull;" aria-label="breadcrumb">
      {
        genebanks.map((g:any, i:number) => {
                return  <a key={i} onClick={() => selectGenebank(g.id)}>
                          <Typography color="textPrimary">
                            {g.name}
                          </Typography>
                        </a>
        })
      }
    </Breadcrumbs>
    <hr />
    {genebank &&
      <>
        Det är {genebank.herds.length} besättningar i genbanken {genebank.name}.
      </>
    }
  </>
}
