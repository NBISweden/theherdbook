/**
 * @file This file contains the BreedingForm function. This function allows
 *       users to create and update breeding events in the database.
 */
import React from 'react'
import { makeStyles } from '@material-ui/core/styles';
import { MuiPickersUtilsProvider, KeyboardDatePicker
        } from '@material-ui/pickers'
import DateFnsUtils from '@date-io/date-fns'
import { dateFormat, Genebank, individualLabel, inputVariant, LimitedHerd,
        OptionType } from '@app/data_context_global';

import { Breeding } from './breeding_list';
import { TextField, Typography } from '@material-ui/core';
import { useDataContext } from './data_context';
import { Autocomplete } from '@material-ui/lab';

const useStyles = makeStyles({
  form: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    padding: '20px',
  },
  formBox: {
    border: '1px solid lightgrey',
    borderRadius: '8px',
    padding: '10px',
  },
  wideControl: {
    width: '100%',
  },
});

const emptyBreeding: Breeding = {
  breed_date: '',
  breed_notes: '',
  father: '',
  mother: '',
  birth_date: '',
  birth_notes: '',
  litter_size: 0,
}

/**
 * The BreedingForm function. This function allows users to create and update
 * breeding events in the database.
 */
export function BreedingForm({data, herdId}: {data: Breeding | 'new', herdId: string | undefined}) {
  const style = useStyles();
  const { genebanks } = useDataContext()
  const [form, setForm] = React.useState({...emptyBreeding} as Breeding)
  const hasBirth = React.useMemo(() => {return !!form.birth_date}, [form])

  /**
   * Sets a single key `label` in the `herd` form to `value` (if herd isn't
   * undefined).
   */
  const setFormField = <B extends keyof Breeding>(label: B, value: Breeding[B]) => {
    form && setForm({...form, [label]: value})
  }
  const herd: LimitedHerd | undefined = React.useMemo(() => {
    const herd = genebanks.map(g => g.herds.find(h => h.herd == herdId))
    if (herd.length) {
      return herd[0];
    }
    return undefined
  }, [genebanks])

  const genebank: Genebank | undefined = React.useMemo(() => {
    return genebanks.find(g => g.herds.find(h => h.herd == herdId))
  }, [genebanks])

  const allFemales: OptionType[] = React.useMemo(() => {
    if (!genebank) {
      return []
    }
    return genebank?.individuals.filter(i => i.sex == 'female').map(i => {
      return {value: i.number, label: individualLabel(i)}
    })
  }, [genebank])

  const allMales: OptionType[] = React.useMemo(() => {
    if (!genebank) {
      return []
    }
    return genebank?.individuals.filter(i => i.sex == 'male').map(i => {
      return {value: i.number, label: individualLabel(i)}
    })
  }, [genebank])

  React.useEffect(() => {

    if (!data || data == 'new') {
      setForm({...emptyBreeding})
    } else {
      setForm(data)
    }
  }, [data])

  return <>
    <form className={style.form}>
      <MuiPickersUtilsProvider utils={DateFnsUtils}>
        <Typography variant='h6'>{data == 'new' && 'Nytt '}Parningstillfälle</Typography>
        <div className={style.formBox}>
          <KeyboardDatePicker
            autoOk
            variant="inline"
            inputVariant={inputVariant}
            label="Parningsdatum"
            format={dateFormat}
            className={style.wideControl}
            value={form ? form.breed_date ?? '' : ''}
            InputLabelProps={{
              shrink: true,
            }}
            onChange={(date, value) => {value && setFormField('breed_date', value)}}
          />
          <Autocomplete
            options={allFemales ?? []}
            value={allFemales.find(option => option.value == form.mother) ?? null}
            getOptionLabel={(option: OptionType) => option.label}
            renderInput={(params) => <TextField {...params}
              label="Mor"
              className={style.wideControl}
              variant={inputVariant}
              margin="normal" />}
            onChange={(event: any, newValue: OptionType | null) => {
              newValue && setFormField('mother', newValue.value)
            }}
          />
          <Autocomplete
            options={allMales ?? []}
            value={allMales.find(option => option.value == form.father) ?? null}
            getOptionLabel={(option: OptionType) => option.label}
            renderInput={(params) => <TextField {...params}
              label="Far"
              className={style.wideControl}
              variant={inputVariant}
              margin="normal" />}
            onChange={(event: any, newValue: OptionType | null) => {
              newValue && setFormField('father', newValue.value)
            }}
          />
          <TextField
            label="Anteckningar om avelstillfället"
            variant={inputVariant}
            className={style.wideControl}
            multiline
            rows={2}
            value={form.breed_notes ?? ''}
            onChange={(e: any) => {setFormField('breed_notes', e.target.value)}}
          />

        </div>
        { data != 'new'
          ? <>
              <Typography variant='h6'>Födsel</Typography>
              <div className={style.formBox}>
                <KeyboardDatePicker
                  autoOk
                  variant="inline"
                  inputVariant={inputVariant}
                  label="Födslodatum"
                  format={dateFormat}
                  className={style.wideControl}
                  value={form ? form.birth_date ?? '' : ''}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  onChange={(date, value) => {value && setFormField('birth_date', value)}}
                />
                <TextField label='Kullstorlek'
                  value={form.litter_size}
                  type='number'
                  className={style.wideControl}
                  variant={inputVariant}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  onChange={(e: any) => {setFormField('litter_size', e.target.value)}}
                  />
                <TextField
                  label="Anteckningar om födseln"
                  variant={inputVariant}
                  className={style.wideControl}
                  multiline
                  rows={2}
                  value={form.birth_notes ?? ''}
                  onChange={(e: any) => {setFormField('birth_notes', e.target.value)}}
                />
              </div>
            </>
          : <p>Ingen födselinformation</p>
        }
      </MuiPickersUtilsProvider>
    </form>
  </>
}
