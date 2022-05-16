import React from "react";

import {
  Box,
  Button,
  Checkbox,
  FormLabel,
  FormControl,
  FormControlLabel,
  FormHelperText,
  makeStyles,
  Typography,
} from "@material-ui/core";
import { CheckCircle } from "@material-ui/icons";

import { Genebank, Individual } from "@app/data_context_global";
import { useDataContext } from "@app/data_context";
import { useMessageContext } from "@app/message_context";
import { IndividualSellingForm } from "./individual_sellingform";
import { patch } from "./communication";

const useStyles = makeStyles({
  infoText: {
    maxWidth: "40em",
  },
  checkContainer: {
    margin: "1.5em 0",
  },
  popupContainer: {
    maxWidth: "45em",
    display: "flex",
    flexDirection: "column",
  },
  textContainer: {
    padding: "1.5em 0",
    minHeight: "11em",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  formContainer: {
    maxWidth: "25em",
  },
  buttonContainer: {
    display: "flex",
  },
  responseBox: {
    width: "100%",
    maxWidth: "65em",
    padding: "1em",
    margin: "2em 0",
  },
  successIcon: {
    fill: "#388e3c", // same as success.dark in the default theme
    marginLeft: "0.5em",
  },
  boxTitle: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
});

interface LimitedIndividualForSale {
  id: number;
  number: string;
  herd: string;
  selling_date: string;
}

export function IndividualSell({ individual }: { individual: Individual }) {
  const [genebank, setGenebank] = React.useState(
    undefined as Genebank | undefined
  );
  const [individualForSale, setIndividualForSale] = React.useState(
    individual as Individual
  );
  const [checked, setChecked] = React.useState(false as boolean);
  const [invalidSale, setInvalidSale] = React.useState(false as boolean);
  const [success, setSuccess] = React.useState(false as boolean);
  const { genebanks, herdListener, herdChangeListener, setHerdChangeListener } =
    useDataContext();
  const { userMessage } = useMessageContext();
  const style = useStyles();
  const disabled: boolean =
    !individualForSale.herd || !individualForSale.selling_date;
  const error: boolean = invalidSale && !checked && !disabled;

  React.useEffect(() => {
    const currentGenebank = genebanks.find((genebank) =>
      genebank.individuals.some((i) => i.number[0] == individual.number[0])
    );

    setGenebank(currentGenebank);
  }, [individual]);

  /**
   * Updates a single field in `individualForSale`.
   *
   * @param field field name to update
   * @param value the new value of the field
   */
  const handleUpdateIndividual = <T extends keyof Individual>(
    field: T,
    value: Individual[T]
  ) => {
    individualForSale &&
      setIndividualForSale({ ...individualForSale, [field]: value });
    setInvalidSale(false);
  };

  /*
  delete the herd field from individualForSale to get the dropdown input for 
  herd empty when component is rendered
  */
  React.useEffect(() => {
    let currentIndividual = individualForSale;
    delete currentIndividual.herd;
    setIndividualForSale(currentIndividual);
  }, []);

  const handleCheckbox = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChecked(event.target.checked);
  };

  const sellIndividual = () => {
    if (!checked) {
      setInvalidSale(true);
      return;
    }
    if (!individualForSale.herd) {
      userMessage("Fyll i en besättning först", "warning");
      return;
    }
    if (!individualForSale.selling_date) {
      userMessage("Fyll i ett köpdatum först.", "warning");
      return;
    }
    const limitedIndividual: LimitedIndividualForSale = {
      id: individualForSale.id,
      number: individualForSale.number,
      herd: individualForSale.herd,
      selling_date: individualForSale.selling_date,
    };
    patch("/api/individual", limitedIndividual).then((json) => {
      if (json.status == "success") {
        if (individual.herd_tracking[0].herd == herdListener) {
          setHerdChangeListener(herdChangeListener + 1);
        }
        setSuccess(true);
        return;
      }
      if (json.status == "error") {
      }
    });
  };

  return (
    <div className={style.popupContainer}>
      <h2>
        Sälja {individual.name} {individual.number}
      </h2>
      {!success ? (
        <>
          <div className={style.textContainer}>
            <Typography variant="body1" className={style.infoText}>
              Ange besättningen som individen ska flyttas till, samt ett datum
              för flytten. Individen kommer tas bort från din besättning och
              läggas till i besättningen du anger.
            </Typography>
            <Typography variant="body1" className={style.infoText}>
              Observera att du då inte längre kan ändra informationen om
              individen. Det går inte heller att utfärda eller uppdatera
              digitala intyg för individen när den har flyttats.
            </Typography>
          </div>
          <div className={style.formContainer}>
            <IndividualSellingForm
              herdHelperText="Väl GX1/MX1 om du har sålt kaninen till en person utanför genbanksystemet"
              buyDateHelperText="Vänligen ange datum för försäljningen"
              individual={individualForSale}
              herdOptions={genebank ? genebank.herds : []}
              onUpdateIndividual={handleUpdateIndividual}
            />
          </div>
          <div>
            <FormControl
              required
              error={error}
              component="fieldset"
              disabled={disabled}
              className={style.checkContainer}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={checked}
                    onChange={handleCheckbox}
                    color="primary"
                    inputProps={{ "aria-label": "primary checkbox" }}
                  />
                }
                label="Jag har tagit del av informationen och vill ta bort individen
            från min besättning."
              ></FormControlLabel>
              <FormHelperText hidden={!error}>
                Bekräfta att du tagit del av informationen.
              </FormHelperText>
            </FormControl>
          </div>
          <div className={style.buttonContainer}>
            <Button
              variant="contained"
              color="primary"
              onClick={sellIndividual}
            >
              Sälj
            </Button>
          </div>{" "}
        </>
      ) : (
        <Box
          border={3}
          borderRadius={8}
          borderColor="success.light"
          className={style.responseBox}
        >
          <div className={style.boxTitle}>
            <h2>Klart!</h2>
            <CheckCircle className={style.successIcon} />
          </div>
          <p>
            Individen har flyttats till besättning {individualForSale.herd}.
          </p>
        </Box>
      )}
    </div>
  );
}
